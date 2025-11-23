import React, { useState } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";

// Utils
import { cn } from "@/lib/utils"; // Assuming you have the standard shadcn utils
import { api } from "@/trpc/react";
import type { ClusterCreateType } from "@/validators/cluster";

// UI Components
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const EdgeDevicesField = ({
  form,
}: {
  form: UseFormReturn<ClusterCreateType>;
}) => {
  const { data, isLoading } = api.edge.list.useQuery();
  const [open, setOpen] = useState(false);

  return (
    <Controller
      name="edgeDeviceIds"
      control={form.control}
      render={({ field, fieldState }) => {
        const selectedIds = field.value ?? [];

        return (
          <Field
            data-invalid={fieldState.invalid}
            className="flex flex-col gap-2"
          >
            <FieldLabel htmlFor={field.name}>Edge Devices</FieldLabel>

            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "h-auto min-h-10 w-full justify-between py-2 text-left font-normal",
                    selectedIds.length && "text-muted-foreground",
                  )}
                >
                  {selectedIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {/* Logic to display selected names or a count */}
                      {isLoading ? (
                        <span>Loading...</span>
                      ) : (
                        <>
                          {selectedIds.length} device
                          {selectedIds.length > 1 ? "s" : ""} selected
                        </>
                      )}
                    </div>
                  ) : (
                    "Select devices..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search devices by name or IP..." />
                  <CommandList>
                    <CommandEmpty>No devices found.</CommandEmpty>
                    <CommandGroup>
                      {isLoading && (
                        <CommandItem disabled>Loading...</CommandItem>
                      )}

                      {data?.map((device) => {
                        const isSelected = selectedIds.includes(device.id);

                        return (
                          <CommandItem
                            key={device.id}
                            value={device.name} // This allows searching by name
                            onSelect={() => {
                              // Toggle logic
                              const newValue = isSelected
                                ? selectedIds.filter((id) => id !== device.id)
                                : [...selectedIds, device.id];

                              field.onChange(newValue);
                              // Note: We do NOT setOpen(false) here to allow multiple selections
                            }}
                          >
                            <div
                              className={cn(
                                "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <Check className={cn("h-4 w-4")} />
                            </div>
                            <div className="flex flex-col">
                              <span>{device.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {device.ipAddress}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <FieldDescription>
              Select one or more edge devices to assign to this cluster.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
};

export default EdgeDevicesField;
