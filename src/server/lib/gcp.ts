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
  const credentials = JSON.parse(config.credentialsJson);

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

  const [response, operation] = await client.insert({
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
