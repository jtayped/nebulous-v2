import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { Provider, Status } from "@/generated/prisma/enums";
import { TRPCError } from "@trpc/server";
import { clusterSchema } from "@/validators/cluster";
import { provisionCluster } from "@/server/lib/provisioning";

export const clusterRouter = createTRPCRouter({
  create: protectedProcedure
    .input(clusterSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Validation
      if (
        (!input.cloudNodes || input.cloudNodes.length === 0) &&
        (!input.edgeDeviceIds || input.edgeDeviceIds.length === 0)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must select at least one Cloud Node or Edge Device.",
        });
      }

      // 2. Create Cluster and Nodes in a Transaction
      const result = await ctx.db.$transaction(async (tx) => {
        // A. Create the Cluster Shell
        const cluster = await tx.cluster.create({
          data: {
            userId: ctx.session.user.id,
            name: input.name,
            status: Status.PENDING, // System will pick this up later
            clusterSoftware: input.software,
          },
        });

        // B. Create Cloud Nodes (Virtual DB entries)
        if (input.cloudNodes && input.cloudNodes.length > 0) {
          await tx.node.createMany({
            data: input.cloudNodes.map((node, idx) => ({
              clusterId: cluster.id,
              name: `${input.name}-cloud-${idx}`,
              provider: node.provider,
              status: Status.PENDING,
              isMaster: node.isMaster,
              instanceType: node.instanceType,
              cpuCores: 0, // Placeholder until provisioned
              memoryGB: 0, // Placeholder until provisioned
              credentialId: node.credentialId,
            })),
          });
        }

        // C. Create Edge Nodes (Link to existing EdgeDevices)
        if (input.edgeDeviceIds && input.edgeDeviceIds.length > 0) {
          // Verify edge devices belong to user
          const devices = await tx.edgeDevice.findMany({
            where: {
              userId: ctx.session.user.id,
              id: { in: input.edgeDeviceIds },
            },
          });

          if (devices.length !== input.edgeDeviceIds.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "One or more Edge Devices not found.",
            });
          }

          // Create Node entries linking to these devices
          await Promise.all(
            devices.map((device) =>
              tx.node.create({
                data: {
                  clusterId: cluster.id,
                  name: device.name,
                  provider: Provider.EDGE,
                  status: Status.PENDING,
                  isMaster: false, // Assuming Edge is usually worker
                  instanceType: "edge-custom",
                  cpuCores: 0, // Could fetch this via SSH later
                  memoryGB: 0,
                  edgeDeviceId: device.id,
                  privateIp: device.ipAddress,
                },
              }),
            ),
          );
        }

        return cluster;
      });

      // Provision the cluster
      void provisionCluster(result.id);

      return {
        success: true,
        clusterId: result.id,
        message: "Cluster provisioning started.",
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.cluster.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { Nodes: true },
        },
      },
    });
  }),

  getStatus: protectedProcedure
    .input(z.object({ clusterId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const cluster = await ctx.db.cluster.findUnique({
        where: { id: input.clusterId, userId: ctx.session.user.id },
        include: {
          Nodes: {
            include: {
              edgeDevice: true, // Include edge details if available
            },
          },
        },
      });

      if (!cluster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cluster not found",
        });
      }

      return {
        cluster: {
          id: cluster.id,
          name: cluster.name,
          status: cluster.status,
          software: cluster.clusterSoftware,
          createdAt: cluster.createdAt,
        },
        nodes: cluster.Nodes,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ clusterId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const cluster = await ctx.db.cluster.findUnique({
        where: { id: input.clusterId, userId: ctx.session.user.id },
      });

      if (!cluster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cluster not found",
        });
      }

      // Update status to DELETING so UI shows spinner
      await ctx.db.cluster.update({
        where: { id: input.clusterId },
        data: { status: Status.DELETING },
      });

      // TRIGGER ASYNC DELETION JOB HERE
      console.log(`[Job] Deletion triggered for Cluster ${input.clusterId}`);

      return { success: true, message: "Cluster deletion initiated." };
    }),
});
