import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { credentialsSchema } from "@/validators/credentials";

export const credentialsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(credentialsSchema)
    .mutation(async ({ ctx, input }) => {
      // Create credential linked to the logged-in user
      const credential = await ctx.db.cloudCredential.create({
        data: {
          userId: ctx.session.user.id,
          provider: input.provider,
          name: input.name,
          region: input.region,
          accessKey: input.accessKey,
          secretKey: input.secretKey,
          projectId: input.projectId,
        },
      });

      return {
        success: true,
        message: "Credential created successfully",
        credential,
      };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.cloudCredential.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        provider: true,
        region: true,
        // Don't return secrets to the client list!
        projectId: true,
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.cloudCredential.findUnique({
        where: { id: input.id },
      });

      if (!existing || existing.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credential not found or access denied",
        });
      }

      await ctx.db.cloudCredential.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: "Credential deleted successfully",
      };
    }),
});
