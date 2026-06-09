/**
 * @file data-table-view-options.tsx
 * @description Column visibility toggle for data tables. Opens a searchable
 * Command popover listing every hideable column. Users can click to show/hide
 * individual columns. Backed by TanStack Table's column visibility state.
 * @layer shared/tables
 */

"use client";

import type { Table } from "@tanstack/react-table";
import { Check, Settings2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableViewOptionsProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  /** TanStack Table instance used to read/write column visibility */
  table: Table<TData>;
  /**
   * When true, the trigger button is rendered but non-interactive.
   * @default false
   */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a "View" button that opens a Command popover with a searchable list
 * of all accessor columns that support hiding. Clicking an item toggles its
 * visibility. A checkmark shows which columns are currently visible.
 *
 * @param table - TanStack Table instance.
 * @param disabled - When true, the trigger button is disabled.
 */
export function DataTableViewOptions<TData>({
  table,
  disabled,
  ...props
}: DataTableViewOptionsProps<TData>) {
  // Only show accessor columns that can be hidden
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (col) =>
            typeof col.accessorFn !== "undefined" && col.getCanHide(),
        ),
    [table],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Toggle columns"
          role="combobox"
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 font-normal lg:flex"
          disabled={disabled}
        >
          <Settings2 className="text-muted-foreground" />
          View
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-44 p-0" align="end" {...props}>
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                >
                  <span className="flex-1 truncate">
                    {/* Prefer the meta label, fall back to the column id */}
                    {column.columnDef.meta?.label ?? column.id}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      column.getIsVisible() ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
