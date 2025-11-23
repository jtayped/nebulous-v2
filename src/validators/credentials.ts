import { Provider } from "@/generated/prisma/enums";
import z from "zod";

export const credentialsSchema = z.object({
  provider: z.enum([Provider.AWS, Provider.GCP]),
  name: z.string().min(1, "Name is required."),
  region: z.string().min(1, "Default region is required (e.g., eu-west-3)."),
  accessKey: z
    .string()
    .min(1, "Access Key (or Service Account data) is required."),
  secretKey: z.string().optional(),
  projectId: z.string().optional(),
});

export type CredentialsCreateType = z.infer<typeof credentialsSchema>;
