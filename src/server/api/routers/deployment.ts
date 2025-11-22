import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { Status } from "@/generated/prisma/enums";
import { TRPCError } from "@trpc/server";

export const deploymentRouter = createTRPCRouter({
  deploy: protectedProcedure
    .input(
      z.object({
        clusterId: z.string().min(1),
        deploymentName: z.string().min(1, "Deployment name is required."),
        payloadType: z.enum(["DOCKER_IMAGE", "K8S_MANIFEST", "NOMAD_JOB"]),
        payloadContent: z.string().min(1, "Payload content is required."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch Cluster and Master Node
      const cluster = await ctx.db.cluster.findUnique({
        where: { id: input.clusterId, userId: ctx.session.user.id },
        include: {
          Nodes: {
            where: { isMaster: true },
            include: { edgeDevice: true },
          },
        },
      });

      if (!cluster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cluster not found",
        });
      }

      if (cluster.status !== Status.ACTIVE) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cluster is not active yet.",
        });
      }

      const masterNode = cluster.Nodes[0];
      if (!masterNode) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No master node found for this cluster.",
        });
      }

      // Determine connection IP (Public IP for Cloud, Private/Edge IP for Edge)
      const targetIp =
        masterNode.publicIp ??
        masterNode.privateIp ??
        masterNode.edgeDevice?.ipAddress;

      if (!targetIp) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Master node has no reachable IP address.",
        });
      }

      // 2. CALL SSH SERVICE HERE
      // In a real app, you would import your SSH utility:
      // await sshExec(targetIp, "root", `kubectl apply -f ...`);

      console.log(
        `[Deployment] Connecting to ${targetIp} to deploy ${input.deploymentName}`,
      );

      return {
        success: true,
        message: `Deployment of ${input.deploymentName} initiated on Master Node (${targetIp})`,
      };
    }),
});
