import React from "react";
import { useFieldArray, Controller, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2, Server, KeyRound } from "lucide-react";

// Validators & Enums
import { type ClusterCreateType } from "@/validators/cluster";
import { Provider } from "@/generated/prisma/enums";

// UI Components
import {
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";

interface CloudNodesFieldProps {
  form: UseFormReturn<ClusterCreateType>;
}

const CloudNodesField = ({ form }: CloudNodesFieldProps) => {
  // 1. Fetch credentials from the DB
  const { data: credentials } = api.credentials.list.useQuery();

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "cloudNodes",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <FieldLabel>Cloud Nodes</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={() =>
            append({
              provider: Provider.AWS,
              instanceType: "",
              isMaster: false,
              credentialId: "", // Initialize empty
            })
          }
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Node</span>
        </Button>
      </div>

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="animate-in fade-in-50 flex min-h-[100px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
            <Server className="text-muted-foreground h-5 w-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No nodes added</h3>
          <p className="text-muted-foreground mt-2 mb-4 text-sm">
            Add cloud nodes to configure your cluster infrastructure.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({
                provider: Provider.AWS,
                instanceType: "",
                isMaster: false,
                credentialId: "",
              })
            }
          >
            Add First Node
          </Button>
        </div>
      )}

      {/* List of Node Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field, index) => {
          // 2. Watch the provider for THIS specific node to filter credentials
          const currentProvider = form.watch(`cloudNodes.${index}.provider`);

          // Filter credentials based on the selected provider
          const validCredentials =
            credentials?.filter((c) => c.provider === currentProvider) ?? [];

          return (
            <Card key={field.id} className="relative overflow-hidden p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded">
                    <span className="text-primary text-xs font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    Node Configuration
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove node</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Provider Select */}
                <div className="space-y-2">
                  <Label htmlFor={`provider-${index}`} className="text-xs">
                    Provider
                  </Label>
                  <Controller
                    control={form.control}
                    name={`cloudNodes.${index}.provider`}
                    render={({ field }) => (
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          // 3. RESET Credential when provider changes to avoid mismatch
                          form.setValue(`cloudNodes.${index}.credentialId`, "");
                        }}
                        defaultValue={field.value}
                      >
                        <SelectTrigger
                          id={`provider-${index}`}
                          className="w-full"
                        >
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={Provider.AWS}>AWS</SelectItem>
                          <SelectItem value={Provider.GCP}>GCP</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Credential Select (New Field) */}
                <div className="space-y-2">
                  <Label htmlFor={`cred-${index}`} className="text-xs">
                    Credential Account
                  </Label>
                  <Controller
                    control={form.control}
                    name={`cloudNodes.${index}.credentialId`}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id={`cred-${index}`} className="w-full">
                          <div className="flex items-center gap-2 truncate">
                            <KeyRound className="h-3 w-3 opacity-50" />
                            <SelectValue placeholder="Select key" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {validCredentials.length > 0 ? (
                            validCredentials.map((cred) => (
                              <SelectItem key={cred.id} value={cred.id}>
                                {cred.name}{" "}
                                <span className="text-muted-foreground text-xs">
                                  ({cred.region})
                                </span>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="text-muted-foreground p-2 text-center text-xs">
                              No {currentProvider} keys found.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {form.formState.errors.cloudNodes?.[index]?.credentialId && (
                    <span className="text-destructive text-[0.8rem] font-medium">
                      Credential required
                    </span>
                  )}
                </div>

                {/* Instance Type Input (Full Width) */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`instance-${index}`} className="text-xs">
                    Instance Type
                  </Label>
                  <Input
                    id={`instance-${index}`}
                    placeholder="e.g. t3.medium (AWS) or e2-medium (GCP)"
                    {...form.register(`cloudNodes.${index}.instanceType`)}
                  />
                  {form.formState.errors.cloudNodes?.[index]?.instanceType && (
                    <span className="text-destructive text-[0.8rem] font-medium">
                      {
                        form.formState.errors.cloudNodes[index]?.instanceType
                          ?.message
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* Is Master Switch */}
              <div className="bg-muted/20 mt-4 flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label className="text-sm">Master Node</Label>
                  <div className="text-muted-foreground text-xs">
                    Designate this as a control plane node.
                  </div>
                </div>
                <Controller
                  control={form.control}
                  name={`cloudNodes.${index}.isMaster`}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <FieldDescription>
        Define the infrastructure composition for this cluster.
      </FieldDescription>

      {form.formState.errors.cloudNodes?.root && (
        <FieldError errors={[form.formState.errors.cloudNodes.root]} />
      )}
    </div>
  );
};

export default CloudNodesField;
