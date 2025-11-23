"use client";

import { clusterSchema, type ClusterCreateType } from "@/validators/cluster";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { api } from "@/trpc/react";
import { toast } from "sonner";

// UI Components
import { FieldGroup } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { Plus, AlertCircle } from "lucide-react"; // Import Icon

// Custom Fields
import NameField from "./fields/name";
import SoftwareField from "./fields/software";
import CloudNodesField from "./fields/cloud-nodes";
import EdgeDevicesField from "./fields/edge-devices";

const ClusterForm = () => {
  const form = useForm<ClusterCreateType>({
    resolver: zodResolver(clusterSchema),
    defaultValues: {
      name: "",
      software: undefined,
      cloudNodes: undefined,
      edgeDeviceIds: undefined,
    },
  });

  const createMutation = api.cluster.create.useMutation({
    onSuccess() {
      toast.success("Cluster has been created!");
      form.reset();
    },
    onError() {
      toast.error("There has been an error creating the cluster :(");
    },
  });

  function onSubmit(data: ClusterCreateType) {
    createMutation.mutate(data);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Card className="grid gap-6 lg:grid-cols-2">
          <NameField form={form} />
          <SoftwareField form={form} />
        </Card>

        <Card>
          <CloudNodesField form={form} />
        </Card>

        <Card className="grid gap-6 md:grid-cols-2">
          <EdgeDevicesField form={form} />
        </Card>

        {/* Error Alert State */}
        {createMutation.isError && (
          <Alert
            variant="destructive"
            className="animate-in fade-in-50 slide-in-from-top-1"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error creating cluster</AlertTitle>
            <AlertDescription>
              {createMutation.error?.message || "An unexpected error occurred."}
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            "Creating..."
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Create cluster
            </>
          )}
        </Button>
      </FieldGroup>
    </form>
  );
};

export default ClusterForm;
