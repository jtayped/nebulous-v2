import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ClusterCreateType } from "@/validators/cluster";
import React from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

const NameField = ({ form }: { form: UseFormReturn<ClusterCreateType> }) => {
  return (
    <Controller
      name="name"
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>Cluster name</FieldLabel>
          <Input
            {...field}
            id={field.name}
            aria-invalid={fieldState.invalid}
            placeholder="cluster-123"
            autoComplete="off"
          />
          <FieldDescription>
            Provide a concice and descriptive cluster name.
          </FieldDescription>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};

export default NameField;
