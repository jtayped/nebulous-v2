import { NodeSSH } from "node-ssh";

export async function executeRemoteCommand(
  host: string,
  username: string,
  privateKey: string,
  commands: string[],
) {
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host,
      username,
      privateKey,
      // readyTimeout: 20000, // Increase if connection is slow
    });

    const results = [];

    for (const cmd of commands) {
      console.log(`[SSH] Executing on ${host}: ${cmd}`);
      const result = await ssh.execCommand(cmd);
      results.push(result);

      if (result.code !== 0) {
        console.error(`[SSH Error] ${result.stderr}`);
        // Depending on strictness, you might want to throw here
      }
    }

    ssh.dispose();
    return results;
  } catch (error) {
    console.error("SSH Connection failed:", error);
    throw error;
  }
}

// PRE-BUILT SCRIPTS for Objective 100
export const INSTALL_SCRIPTS = {
  DOCKER: [
    "curl -fsSL https://get.docker.com -o get-docker.sh",
    "sudo sh get-docker.sh",
    "sudo usermod -aG docker $USER",
  ],
  K3S_MASTER: [
    "curl -sfL https://get.k3s.io | sh -",
    // Get the token to join workers later
    "sudo cat /var/lib/rancher/k3s/server/node-token",
  ],
  K3S_WORKER: (masterIp: string, token: string) => [
    `curl -sfL https://get.k3s.io | K3S_URL=https://${masterIp}:6443 K3S_TOKEN=${token} sh -`,
  ],
};
