import { ClusterSoftware, Provider } from "@/generated/prisma/enums";
import z from "zod";

export const clusterSchema = z.object({
  name: z.string().min(1, "Cluster name is required."),
  software: z.nativeEnum(ClusterSoftware),
  // Cloud Nodes configuration
  cloudNodes: z
    .array(
      z.object({
        provider: z.enum([Provider.AWS, Provider.GCP]),
        instanceType: z.string().min(1),
        isMaster: z.boolean().default(false),
      }),
    )
    .optional(),
  // Edge Device IDs selected from the list
  edgeDeviceIds: z.array(z.string()).optional(),
  credentialId: z.string().min(1).optional(),
});

export type ClusterCreateType = z.infer<typeof clusterSchema>;
