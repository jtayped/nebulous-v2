import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { Provider } from "@/generated/prisma/enums";
import { TRPCError } from "@trpc/server";

export const catalogRouter = createTRPCRouter({
  getMachineTypes: protectedProcedure
    .input(
      z.object({
        provider: z.enum([Provider.AWS, Provider.GCP]),
        region: z.string().min(1).optional(),
        credentialId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 1. Security: Ensure the user actually owns this credential
      const validCred = await ctx.db.cloudCredential.findUnique({
        where: {
          id: input.credentialId,
          userId: ctx.session.user.id,
        },
      });

      if (!validCred) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid credential provided.",
        });
      }

      // 2. Mock Data (Replace with actual SDK calls: aws-sdk or @google-cloud/compute)
      // Note: In a hackathon, if the SDK fails, fall back to this mock data so the UI doesn't break.
      if (input.provider === Provider.GCP) {
        return [
          {
            name: "e2-medium",
            cpu: 2,
            memoryGB: 4,
            costPerHour: 0.04,
            provider: input.provider,
            description: "Standard GCP VM",
          },
          {
            name: "e2-micro",
            cpu: 2,
            memoryGB: 1,
            costPerHour: 0.01,
            provider: input.provider,
            description: "Cheap GCP VM",
          },
        ];
      } else {
        return [
          {
            name: "t3.medium",
            cpu: 2,
            memoryGB: 4,
            costPerHour: 0.0416,
            provider: input.provider,
            description: "General Purpose AWS",
          },
          {
            name: "t2.micro",
            cpu: 1,
            memoryGB: 1,
            costPerHour: 0.0116,
            provider: input.provider,
            description: "Free tier eligible",
          },
        ];
      }
    }),
});
