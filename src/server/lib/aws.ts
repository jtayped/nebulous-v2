import {
  type _InstanceType,
  DescribeInstancesCommand,
  EC2Client,
  RunInstancesCommand,
} from "@aws-sdk/client-ec2";

interface AwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface CreateParams {
  instanceType: string; // e.g., "t2.micro"
  publicKey: string;
  nameTag: string;
}

// Hardcoded AMI for Ubuntu 22.04 (eu-west-1).
// IN A REAL APP: You would dynamically search for the AMI ID based on region.
const AMI_MAP: Record<string, string> = {
  "eu-west-3": "ami-00ac45f306d58a38d", // Paris
  "us-east-1": "ami-0c7217cdde317cfec", // N. Virginia
  // Fallback
  default: "ami-00ac45f306d58a38d",
};

export async function createAwsInstance(
  config: AwsConfig,
  params: CreateParams,
) {
  const client = new EC2Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  // We inject the public key into the default user (ubuntu) via a startup script
  const userDataScript = `#!/bin/bash
mkdir -p /home/ubuntu/.ssh
echo "${params.publicKey}" >> /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh
  `;

  const command = new RunInstancesCommand({
    ImageId: AMI_MAP[config.region] ?? AMI_MAP.default,
    InstanceType: params.instanceType as _InstanceType, // e.g. "t2.micro"
    MinCount: 1,
    MaxCount: 1,
    UserData: Buffer.from(userDataScript).toString("base64"),
    TagSpecifications: [
      {
        ResourceType: "instance",
        Tags: [{ Key: "Name", Value: params.nameTag }],
      },
    ],
  });

  try {
    const data = await client.send(command);
    const instanceId = data.Instances?.[0]?.InstanceId;

    // Note: Public IP is not available immediately.
    // The Provisioning Job will have to poll for it later using DescribeInstances.
    return { instanceId, success: true };
  } catch (error) {
    console.error("AWS Creation Error:", error);
    throw error;
  }
}

export async function getAwsPublicIp(
  config: AwsConfig,
  instanceId: string,
): Promise<string | undefined> {
  const client = new EC2Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const command = new DescribeInstancesCommand({
    InstanceIds: [instanceId],
  });

  const data = await client.send(command);
  const instance = data.Reservations?.[0]?.Instances?.[0];
  return instance?.PublicIpAddress;
}
