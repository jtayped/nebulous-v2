import { db } from "@/server/db";
import { generateSSHKeyPair } from "./keys";
import { createAwsInstance, getAwsPublicIp } from "./aws";
import { createGcpInstance, getGcpPublicIp } from "./gcp";
import { executeRemoteCommand, INSTALL_SCRIPTS } from "./ssh";
import { Provider, Status, ClusterSoftware } from "@/generated/prisma/enums";

// Helper to wait until SSH is actually ready
async function waitForSSH(
  ip: string,
  user: string,
  privateKey: string,
  maxRetries = 50, // ~5 minutes
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await executeRemoteCommand(ip, user, privateKey, ["echo 'SSH Ready'"]);
      return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log(`[SSH] Waiting for ${ip}... (${i + 1}/${maxRetries})`);
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
  // STAGE 1: LAUNCH
  // ==========================================================
  console.log("[Provisioning] Stage 1: Launching VMs...");

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
  // STAGE 2: NETWORK
  // ==========================================================
  console.log("[Provisioning] Stage 2: Waiting for Network...");
  await new Promise((r) => setTimeout(r, 15000));

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
        const ip = await getGcpPublicIp(
          {
            projectId: node.credential.projectId!,
            credentialsJson: node.credential.accessKey,
            zone: `${node.credential.region}-b`,
          },
          node.machineId!,
        );
        publicIp = ip ?? "";
      } else if (node.provider === Provider.EDGE) {
        publicIp = node.edgeDevice!.ipAddress;
      }
      // GCP IP fetch logic omitted for brevity, assuming existing logic or static

      if (publicIp) {
        // CHANGE: Update IP, but keep status as PROVISIONING
        await db.node.update({
          where: { id: node.id },
          data: { publicIp }, // <--- No Status Change yet
        });
        console.log(
          `[Network] Node ${node.name} has IP ${publicIp} (Waiting for SSH...)`,
        );
      }
    } catch (e) {
      console.error(`[Network] Failed to get IP for ${node.name}`, e);
    }
  }

  // ==========================================================
  // STAGE 3: BOOTSTRAP
  // ==========================================================
  console.log("[Provisioning] Stage 3: Bootstrapping...");

  // Fetch nodes again to ensure we have IPs
  const activeNodes = await db.node.findMany({
    where: { clusterId: cluster.id, status: Status.PROVISIONING }, // Only grab provisioning ones
    include: { edgeDevice: true },
  });

  for (const node of activeNodes) {
    // If we didn't get an IP in stage 2, mark failed and skip
    if (!node.publicIp && node.provider !== Provider.GCP) {
      // Loose check for GCP
      await db.node.update({
        where: { id: node.id },
        data: { status: Status.FAILED },
      });
      continue;
    }

    if (!node.publicIp) continue; // Skip if no IP (shouldn't happen due to check above)

    try {
      let commands: string[] = [];
      if (cluster.clusterSoftware === ClusterSoftware.DOCKER_SWARM) {
        commands = INSTALL_SCRIPTS.DOCKER_SWARM;
      } else if (cluster.clusterSoftware === ClusterSoftware.K3S) {
        commands = node.isMaster ? INSTALL_SCRIPTS.K3S : [];
      }

      const sshUser =
        node.provider === Provider.EDGE
          ? (node.edgeDevice?.sshUser ?? "root")
          : "ubuntu";

      if (node.provider !== Provider.EDGE) {
        console.log(
          `[Bootstrap] Connecting to ${node.name} (${node.publicIp})...`,
        );

        // 1. Wait for SSH to be fully ready
        await waitForSSH(node.publicIp, sshUser, privateKey);

        // 2. Run Commands
        if (commands.length > 0) {
          await executeRemoteCommand(
            node.publicIp,
            sshUser,
            privateKey,
            commands,
          );
        }

        // 3. CHANGE: NOW we set it to ACTIVE
        await db.node.update({
          where: { id: node.id },
          data: { status: Status.ACTIVE },
        });
        console.log(`[Bootstrap] Finished ${node.name} -> ACTIVE`);
      } else {
        // For Edge, we assume it's ready if IP is there
        await db.node.update({
          where: { id: node.id },
          data: { status: Status.ACTIVE },
        });
      }
    } catch (e) {
      console.error(`[Bootstrap] Failed ${node.name}`, e);
      await db.node.update({
        where: { id: node.id },
        data: { status: Status.FAILED },
      });
    }
  }

  // Final Cluster Status Update
  await db.cluster.update({
    where: { id: clusterId },
    data: { status: Status.ACTIVE },
  });

  console.log(`[Provisioning] Cluster ${clusterId} is fully ready.`);
}
