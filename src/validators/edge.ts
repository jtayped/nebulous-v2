import z from "zod";

export const edgeSchema = z.object({
  name: z.string().min(1, "Name is required."),
  ipAddress: z.string().ip("Must be a valid IP address."),
  sshUser: z.string().min(1, "SSH username is required."),
  sshPublicKey: z.string().optional(),
});

export type EdgeCreateType = z.infer<typeof edgeSchema>;
