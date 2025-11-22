import { db } from "@/server/db";
import { generateSSHKeyPair } from "./keys";
import { createAwsInstance, getAwsPublicIp } from "./aws"; // We need to add getAwsPublicIp below
import { createGcpInstance } from "./gcp";
import { executeRemoteCommand, INSTALL_SCRIPTS } from "./ssh";
import { Provider, Status, ClusterSoftware } from "@/generated/prisma/enums";

export async function provisionCluster(clusterId: string) {
  console.log(`[Provisioning] Starting for cluster ${clusterId}`);

  const cluster = await db.cluster.findUnique({
    where: { id: clusterId },
    include: { Nodes: true, credential: true },
  });

  if (!cluster || !cluster.credential) return;

  // 1. Generate KeyPair
  const { publicKey, privateKey } = await generateSSHKeyPair();

  // 2. SAVE Private Key to DB immediately
  await db.cluster.update({
    where: { id: clusterId },
    data: { sshPrivateKey: privateKey },
  });

  // 3. Provision VMs
  for (const node of cluster.Nodes) {
    try {
      await db.node.update({
        where: { id: node.id },
        data: { status: Status.PROVISIONING },
      });

      let machineId = "";
      let publicIp = "";

      if (node.provider === Provider.AWS) {
        // A. Create AWS Instance
        const result = await createAwsInstance(
          {
            region: cluster.credential.region,
            accessKeyId: cluster.credential.accessKey,
            secretAccessKey: cluster.credential.secretKey!,
          },
          {
            instanceType: node.instanceType,
            nameTag: node.name,
            publicKey: publicKey,
          },
        );
        machineId = result.instanceId!;

        // B. Wait for Public IP (AWS takes a few seconds to assign it)
        // In a real app, use a proper exponential backoff/queue
        console.log(`[AWS] Waiting for IP assignment for ${machineId}...`);
        await new Promise((r) => setTimeout(r, 10000)); // Wait 10s

        publicIp =
          (await getAwsPublicIp(
            {
              region: cluster.credential.region,
              accessKeyId: cluster.credential.accessKey,
              secretAccessKey: cluster.credential.secretKey!,
            },
            machineId,
          )) ?? "";
      } else if (node.provider === Provider.GCP) {
        // GCP usually assigns IP immediately if we requested Ephemeral
        const result = await createGcpInstance(
          {
            projectId: cluster.credential.projectId!,
            credentialsJson: cluster.credential.accessKey,
            zone: `${cluster.credential.region}-b`,
          },
          {
            name: node.name.toLowerCase(),
            machineType: node.instanceType,
            publicKey: publicKey,
          },
        );
        machineId = result.instanceName;

        // For Hackathon simplicity, assume the IP is available or fetch it similarly to AWS
        // (Skipping complex GCP IP fetch code for brevity, but you'd use instancesClient.get)
        // Let's assume we can't get it immediately and rely on the user to refresh,
        // OR add a similar getGcpInstanceDetails function.
      }

      // 4. Update Node in DB
      await db.node.update({
        where: { id: node.id },
        data: {
          machineId,
          publicIp: publicIp, // Save the IP!
          status: Status.ACTIVE, // Mark VM as running
        },
      });

      // 5. BOOTSTRAP (Install Software) - Objective 100
      if (publicIp) {
        console.log(`[Bootstrap] Installing software on ${publicIp}...`);

        // Wait for SSH to be ready (VM boot time)
        await new Promise((r) => setTimeout(r, 20000));

        let commands: string[] = [];
        if (cluster.clusterSoftware === ClusterSoftware.DOCKER_SWARM) {
          commands = INSTALL_SCRIPTS.DOCKER;
        } else if (cluster.clusterSoftware === ClusterSoftware.K3S) {
          commands = node.isMaster ? INSTALL_SCRIPTS.K3S_MASTER : [];
          // Note: Joining workers requires the token from master, which is complex for 1 file.
          // For the hackathon, just installing K3S on the master is a huge win.
        }

        if (commands.length > 0) {
          // AWS/GCP usually default to 'ubuntu' user
          await executeRemoteCommand(publicIp, "ubuntu", privateKey, commands);
        }
      }
    } catch (e) {
      console.error(`Failed node ${node.name}`, e);
      await db.node.update({
        where: { id: node.id },
        data: { status: Status.FAILED },
      });
    }
  }

  // 6. Mark Cluster as Active
  await db.cluster.update({
    where: { id: clusterId },
    data: { status: Status.ACTIVE },
  });
}
