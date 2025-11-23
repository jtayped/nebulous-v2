import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { edgeSchema } from "@/validators/edge";

export const edgeRouter = createTRPCRouter({
  register: protectedProcedure
    .input(edgeSchema)
    .mutation(async ({ ctx, input }) => {
      // check if IP already exists globally or for user (Schema says IP is unique globally)
      const existing = await ctx.db.edgeDevice.findUnique({
        where: { ipAddress: input.ipAddress },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A device with this IP is already registered.",
        });
      }

      const device = await ctx.db.edgeDevice.create({
        data: {
          userId: ctx.session.user.id,
          ...input,
        },
      });

      return { success: true, message: "Edge device registered", device };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.edgeDevice.findMany({
      where: { userId: ctx.session.user.id },
    });
  }),

  deregister: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const count = await ctx.db.edgeDevice.count({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Device not found" });
      }

      await ctx.db.edgeDevice.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: "Edge device deregistered",
      };
    }),
});
