"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { toast } from "sonner";
import { ClusterSoftware, Status } from "@/generated/prisma/enums";

// UI Components
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Icons
import { RefreshCw, Trash2, Loader2, Rocket } from "lucide-react";

// --- Deployment Modal Component ---
const DeploymentDialog = ({
  clusterId,
  software,
}: {
  clusterId: string;
  software: ClusterSoftware;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const deployMutation = api.deployment.deploy.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setOpen(false);
      setName("");
      setContent("");
    },
    onError: (err) => {
      toast.error("Deployment failed: " + err.message);
    },
  });

  const isK8s = software === ClusterSoftware.K3S;
  const placeholder = isK8s
    ? `apiVersion: v1\nkind: Pod\nmetadata:\n  name: nginx-pod\nspec:\n  containers:\n  - name: nginx\n    image: nginx:alpine`
    : `nginx:alpine`;

  const handleSubmit = () => {
    deployMutation.mutate({
      clusterId,
      deploymentName: name,
      payloadType: isK8s ? "K8S_MANIFEST" : "DOCKER_IMAGE",
      payloadContent: content,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Rocket className="h-4 w-4" /> Deploy App
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Deploy to {isK8s ? "Kubernetes" : "Swarm"}</DialogTitle>
          <DialogDescription>
            {isK8s
              ? "Paste your Kubernetes Manifest (YAML) below."
              : "Enter the Docker Image name and arguments."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Deployment Name</Label>
            <Input
              id="name"
              placeholder="my-app"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">
              {isK8s ? "Manifest (YAML)" : "Image Name"}
            </Label>
            <Textarea
              id="content"
              placeholder={placeholder}
              className="max-h-[250px] min-h-[150px] font-mono text-xs"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={deployMutation.isPending}>
            {deployMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- Main Actions Component ---
const ClusterActions = ({
  cluster,
}: {
  cluster: RouterOutputs["cluster"]["getStatus"];
}) => {
  const router = useRouter();
  const isActive = cluster.cluster.status === Status.ACTIVE;

  // 1. Delete Mutation
  const deleteMutation = api.cluster.delete.useMutation({
    onSuccess: () => {
      toast.success("Cluster deletion initiated");
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error("Failed to delete cluster: " + error.message);
    },
  });

  // 2. Refresh Logic
  const handleRefresh = () => {
    router.refresh();
    toast.success("Status refreshed");
  };

  return (
    <div className="flex items-center gap-3">
      {/* Deploy Button (Only visible if ACTIVE) */}
      {isActive && (
        <DeploymentDialog
          clusterId={cluster.cluster.id}
          software={cluster.cluster.software}
        />
      )}

      {/* Refresh Button */}
      <Button variant="outline" size="sm" onClick={handleRefresh}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              cluster{" "}
              <span className="text-foreground font-semibold">
                {cluster.cluster.name}
              </span>{" "}
              and terminate all associated cloud instances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteMutation.mutate({ clusterId: cluster.cluster.id })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Cluster"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClusterActions;
