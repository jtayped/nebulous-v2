import { InstancesClient } from "@google-cloud/compute";
import { formatGcpKey } from "./keys";

interface GcpConfig {
  projectId: string;
  credentialsJson: string; // The full JSON string from the service account file
  zone: string; // e.g., "europe-west1-b"
}

interface CreateParams {
  name: string;
  machineType: string; // e.g., "e2-medium"
  publicKey: string; // Raw PEM
}

export async function createGcpInstance(
  config: GcpConfig,
  params: CreateParams,
) {
  // Parse the JSON string credentials
  const credentials = JSON.parse(config.credentialsJson) as object;

  const client = new InstancesClient({
    credentials,
    projectId: config.projectId,
  });

  const zone = config.zone;
  const machineType = `zones/${zone}/machineTypes/${params.machineType}`;
  const sourceImage =
    "projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts";

  // Format key specifically for GCP metadata
  const gcpKeyVal = formatGcpKey("ubuntu", params.publicKey);

  const [, operation] = await client.insert({
    project: config.projectId,
    zone,
    instanceResource: {
      name: params.name,
      machineType,
      disks: [
        {
          boot: true,
          initializeParams: {
            sourceImage,
          },
        },
      ],
      networkInterfaces: [
        {
          // "global/networks/default" requires the 'default' VPC to exist
          name: "global/networks/default",
          accessConfigs: [
            {
              // This requests an ephemeral public IP
              name: "External NAT",
              type: "ONE_TO_ONE_NAT",
            },
          ],
        },
      ],
      metadata: {
        items: [
          {
            key: "ssh-keys",
            value: gcpKeyVal,
          },
        ],
      },
    },
  });

  // In GCP, the operation ID helps us track completion
  return {
    operationName: operation?.name,
    instanceName: params.name,
    success: true,
  };
}

export async function getGcpPublicIp(
  config: GcpConfig,
  instanceName: string,
): Promise<string | undefined> {
  const credentials = JSON.parse(config.credentialsJson) as object;
  const client = new InstancesClient({
    credentials,
    projectId: config.projectId,
  });

  try {
    // Fetch the instance details
    const [instance] = await client.get({
      project: config.projectId,
      zone: config.zone,
      instance: instanceName,
    });

    // GCP structure: networkInterfaces[0] -> accessConfigs[0] -> natIP
    return (
      instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP ?? undefined
    );
  } catch (error) {
    console.error(`[GCP] Failed to get IP for ${instanceName}`, error);
    return undefined;
  }
}

export async function deleteGcpInstance(
  config: GcpConfig,
  instanceName: string,
) {
  const credentials = JSON.parse(config.credentialsJson) as object;
  const client = new InstancesClient({
    credentials,
    projectId: config.projectId,
  });

  const zone = config.zone;

  try {
    console.log(`[GCP] Deleting instance ${instanceName} in ${zone}...`);

    const [operation] = await client.delete({
      project: config.projectId,
      zone,
      instance: instanceName,
    });

    // In a real app we might wait for operation completion,
    // but for delete, firing the request is usually enough.
    return { success: true, operation };
  } catch (error) {
    console.error(`[GCP] Deletion Error for ${instanceName}:`, error);
    return { success: false, error };
  }
}
