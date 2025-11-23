import React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Controller, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { ClusterSoftware } from "@/generated/prisma/enums";
import type { ClusterCreateType } from "@/validators/cluster";

const SoftwareField = ({
  form,
}: {
  form: UseFormReturn<ClusterCreateType>;
}) => {
  return (
    <Controller
      name="software"
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>Cluster software</FieldLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value as ClusterSoftware}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a software" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Softwares</SelectLabel>
                <SelectItem value={ClusterSoftware.DOCKER_SWARM}>
                  Docker Swarm
                </SelectItem>
                <SelectItem value={ClusterSoftware.K3S}>K3S</SelectItem>
                <SelectItem value={ClusterSoftware.KUBERNETES}>
                  Kubernetes
                </SelectItem>
                <SelectItem value={ClusterSoftware.NOMAD}>Nomad</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Choose your orchestration software.
          </FieldDescription>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};

export default SoftwareField;
