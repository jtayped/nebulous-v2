import z from "zod";

export const deploymentSchema = z.object({
  clusterId: z.string().min(1),
  deploymentName: z.string().min(1, "Deployment name is required."),
  payloadType: z.enum(["DOCKER_IMAGE", "K8S_MANIFEST", "NOMAD_JOB"]),
  payloadContent: z.string().min(1, "Payload content is required."),
});

export type DeploymentCreateType = z.infer<typeof deploymentSchema>;
