"use client";

import type { RouterOutputs } from "@/trpc/react";
import React from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Server, Box, Network } from "lucide-react";
import { ClusterSoftware } from "@/generated/prisma/enums";
import { getStatusBadge } from "../ui/status";
import Node from "./node";
import ClusterActions from "./actions";

const SoftwareIcon = ({ type }: { type: ClusterSoftware }) => {
  if (type === ClusterSoftware.K3S) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white shadow-sm">
          <span className="text-[10px] font-bold">K3S</span>
        </div>
        <span className="font-semibold">Kubernetes (K3s)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-sky-500 text-white shadow-sm">
        <Box className="h-5 w-5" />
      </div>
      <span className="font-semibold">Docker Swarm</span>
    </div>
  );
};

// --- Main Component ---

const Cluster = ({
  cluster,
}: {
  cluster: RouterOutputs["cluster"]["getStatus"];
}) => {
  const masterNode = cluster.nodes.find((n) => n.isMaster);

  return (
    <div className="animate-in fade-in-50 space-y-8">
      {/* 1. Cluster Header & Overview */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {cluster.cluster.name}
            </h1>
            <div className="text-muted-foreground mt-1 flex items-center gap-2">
              <span className="bg-muted rounded px-2 py-0.5 font-mono text-xs">
                {cluster.cluster.id}
              </span>
              <span className="text-xs">•</span>
              <span className="text-sm">
                Created {format(cluster.cluster.createdAt, "PPP")}
              </span>
            </div>
          </div>
          <ClusterActions cluster={cluster} />
        </div>

        {/* Overview Card */}
        <Card className="p-6">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Status Section */}
            <div className="space-y-2">
              <span className="text-muted-foreground text-sm font-medium">
                Cluster Status
              </span>
              <div className="flex items-center gap-2">
                {getStatusBadge(cluster.cluster.status)}
              </div>
            </div>

            {/* Software Section */}
            <div className="space-y-2">
              <span className="text-muted-foreground text-sm font-medium">
                Orchestration
              </span>
              <SoftwareIcon type={cluster.cluster.software} />
            </div>

            {/* Connectivity Section */}
            <div className="space-y-2">
              <span className="text-muted-foreground text-sm font-medium">
                Master Endpoint
              </span>
              <div className="flex items-center gap-2">
                <Network className="text-muted-foreground h-4 w-4" />
                <span className="font-mono text-sm">
                  {masterNode?.publicIp ??
                    masterNode?.privateIp ??
                    "Pending IP..."}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Separator />

      {/* 2. Nodes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Server className="h-5 w-5" /> Nodes
            <Badge variant="secondary" className="ml-2">
              {cluster.nodes.length}
            </Badge>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cluster.nodes.map((n) => (
            <Node node={n} key={n.id} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Cluster;
