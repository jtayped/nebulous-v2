import { generateKeyPair } from "crypto";
import { promisify } from "util";

const generateKeyPairAsync = promisify(generateKeyPair);

export async function generateSSHKeyPair() {
  // Generates a standard RSA keypair
  const { publicKey, privateKey } = await generateKeyPairAsync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1",
      format: "pem",
    },
  });

  return { publicKey, privateKey };
}

// Helper to format key for GCP metadata (username:ssh-rsa AAA...)
export function formatGcpKey(username: string, publicKey: string) {
  const cleanKey = publicKey.trim();
  return `${username}:${cleanKey}`;
}
