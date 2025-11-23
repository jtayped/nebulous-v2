import { db } from "@/server/db";
import { generateSSHKeyPair } from "./keys";
import { createAwsInstance, getAwsPublicIp } from "./aws";
import { createGcpInstance } from "./gcp";
import { executeRemoteCommand, INSTALL_SCRIPTS } from "./ssh";
import { Provider, Status, ClusterSoftware } from "@/generated/prisma/enums";

// Helper to wait until SSH is actually ready with retry logic
async function waitForSSH(
  ip: string,
  user: string,
  privateKey: string,
  maxRetries = 20,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await executeRemoteCommand(ip, user, privateKey, ["echo 'SSH Ready'"]);
      return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log(
        `[SSH] Waiting for ${ip} to accept connections... (${i + 1}/${maxRetries})`,
      );
      await new Promise((r) => setTimeout(r, 6000));
    }
  }
  throw new Error(`SSH Connection timed out after ${maxRetries} attempts`);
}

export async function provisionCluster(clusterId: string) {
  console.log(`[Provisioning] Starting for cluster ${clusterId}`);

  const cluster = await db.cluster.findUnique({
    where: { id: clusterId },
    include: {
      Nodes: {
        include: { credential: true, edgeDevice: true },
      },
    },
  });

  if (!cluster) return;

  const { publicKey, privateKey } = await generateSSHKeyPair();

  await db.cluster.update({
    where: { id: clusterId },
    data: { sshPrivateKey: privateKey },
  });

  // ==========================================================
  // STAGE 1: LAUNCH (Create all VMs simultaneously)
  // ==========================================================
  console.log("[Provisioning] Stage 1: Launching VMs...");

  // We map the nodes to an array of promises to run them in parallel
  // However, for safety in a hackathon (rate limits), let's keep it sequential but fast
  // (We just create the VM, we don't wait for IP yet)

  for (const node of cluster.Nodes) {
    try {
      await db.node.update({
        where: { id: node.id },
        data: { status: Status.PROVISIONING },
      });

      let machineId = "";

      if (node.provider === Provider.AWS) {
        if (!node.credential) throw new Error("AWS Node missing credentials");
        const result = await createAwsInstance(
          {
            region: node.credential.region,
            accessKeyId: node.credential.accessKey,
            secretAccessKey: node.credential.secretKey!,
          },
          {
            instanceType: node.instanceType,
            nameTag: node.name,
            publicKey: publicKey,
          },
        );
        machineId = result.instanceId!;
      } else if (node.provider === Provider.GCP) {
        if (!node.credential) throw new Error("GCP Node missing credentials");
        const randomSuffix = Math.floor(Math.random() * 10000);
        const uniqueName = `${node.name.toLowerCase()}-${randomSuffix}`;

        const result = await createGcpInstance(
          {
            projectId: node.credential.projectId!,
            credentialsJson: node.credential.accessKey,
            zone: `${node.credential.region}-b`,
          },
          {
            name: uniqueName,
            machineType: node.instanceType,
            publicKey: publicKey,
          },
        );
        machineId = result.instanceName;
      } else if (node.provider === Provider.EDGE && node.edgeDevice) {
        machineId = "edge-" + node.edgeDevice.id;
      }

      // Save the Machine ID immediately so we can track it
      if (machineId) {
        await db.node.update({
          where: { id: node.id },
          data: { machineId },
        });
        console.log(`[Launch] Node ${node.name} created with ID ${machineId}`);
      }
    } catch (e) {
      console.error(`[Launch] Failed to launch ${node.name}`, e);
      await db.node.update({
        where: { id: node.id },
        data: { status: Status.FAILED },
      });
    }
  }

  // ==========================================================
  // STAGE 2: NETWORK (Wait for IPs)
  // ==========================================================
  console.log("[Provisioning] Stage 2: Waiting for Network...");

  // Wait a flat 15 seconds for clouds to catch up
  await new Promise((r) => setTimeout(r, 15000));

  // Re-fetch nodes to get the latest DB state (machineIds)
  const launchedNodes = await db.node.findMany({
    where: { clusterId: cluster.id, status: Status.PROVISIONING },
    include: { credential: true, edgeDevice: true },
  });

  for (const node of launchedNodes) {
    let publicIp = "";

    try {
      if (node.provider === Provider.AWS) {
        const ip = await getAwsPublicIp(
          {
            region: node.credential.region,
            accessKeyId: node.credential.accessKey,
            secretAccessKey: node.credential.secretKey!,
          },
          node.machineId!,
        );
        publicIp = ip ?? "";
      } else if (node.provider === Provider.GCP) {
        // NOTE: Ideally call GCP getInstance here.
        // For now assuming user set static IP or we skip auto-fetch
        console.log("GCP IP fetch skipped (Check console)");
      } else if (node.provider === Provider.EDGE) {
        publicIp = node.edgeDevice!.ipAddress;
      }

      if (publicIp) {
        await db.node.update({
          where: { id: node.id },
          data: { publicIp, status: Status.ACTIVE },
        });
        console.log(`[Network] Node ${node.name} has IP ${publicIp}`);
      }
    } catch (e) {
      console.error(`[Network] Failed to get IP for ${node.name}`, e);
    }
  }

  // ==========================================================
  // STAGE 3: BOOTSTRAP (Install Software)
  // ==========================================================
  console.log("[Provisioning] Stage 3: Bootstrapping...");

  // Re-fetch nodes that have IPs
  const activeNodes = await db.node.findMany({
    where: { clusterId: cluster.id, status: Status.ACTIVE },
    include: { edgeDevice: true },
  });

  for (const node of activeNodes) {
    try {
      let commands: string[] = [];
      if (cluster.clusterSoftware === ClusterSoftware.DOCKER_SWARM) {
        commands = INSTALL_SCRIPTS.DOCKER_SWARM;
      } else if (cluster.clusterSoftware === ClusterSoftware.K3S) {
        commands = node.isMaster ? INSTALL_SCRIPTS.K3S : [];
      }

      if (commands.length > 0) {
        const sshUser =
          node.provider === Provider.EDGE
            ? (node.edgeDevice?.sshUser ?? "root")
            : "ubuntu";

        if (node.provider !== Provider.EDGE) {
          console.log(
            `[Bootstrap] Connecting to ${node.name} (${node.publicIp})...`,
          );
          await waitForSSH(node.publicIp!, sshUser, privateKey);
          await executeRemoteCommand(
            node.publicIp!,
            sshUser,
            privateKey,
            commands,
          );
          console.log(`[Bootstrap] Finished ${node.name}`);
        }
      }
    } catch (e) {
      console.error(`[Bootstrap] Failed ${node.name}`, e);
      // Don't fail the whole node, maybe just the install failed
    }
  }

  // Final Cluster Status Update
  await db.cluster.update({
    where: { id: clusterId },
    data: { status: Status.ACTIVE },
  });

  console.log(`[Provisioning] Cluster ${clusterId} is fully ready.`);
}
