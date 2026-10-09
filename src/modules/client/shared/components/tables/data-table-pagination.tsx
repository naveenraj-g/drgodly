/**
 * @file data-table-pagination.tsx
 * @description Pagination control bar for data tables. Renders rows-per-page
 * select, current page indicator, and first/prev/next/last navigation buttons.
 * Works with any TanStack Table instance — client-side or server-side.
 * @layer shared/tables
 */

import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTablePaginationProps<TData> extends React.ComponentProps<"div"> {
  /** TanStack Table instance that drives pagination state */
  table: Table<TData>;
  /**
   * Available page-size options rendered in the per-page select.
   * @default [10, 20, 30, 40, 50]
   */
  pageSizeOptions?: number[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-featured pagination bar that displays:
 * - Selected row count out of total filtered rows
 * - Rows-per-page selector
 * - Current page / total pages indicator
 * - First, Previous, Next, Last navigation buttons
 *
 * @param table - TanStack Table instance.
 * @param pageSizeOptions - List of page size choices.
 * @param className - Additional Tailwind classes for the wrapper div.
 */
export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  return (
    <div
      className={cn(
        // flex-wrap rather than a hard flex-col-reverse/sm:flex-row switch:
        // the old version forced every group (selected-rows text, rows-per-
        // page, page indicator, nav buttons) onto its own full-width row —
        // in reverse DOM order — the moment the bar dropped below `sm`,
        // even when there was room for two or three groups on one line.
        // This keeps everything on one row whenever it fits and only wraps
        // the groups that actually don't, in their natural left-to-right
        // order.
        "flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 overflow-auto p-1",
        className,
      )}
      {...props}
    >
      {/* Selected rows indicator — only for tables that actually offer row
          selection (a "select" checkbox column). Tables without one (e.g.
          the doctor/patient appointment lists) would otherwise always show
          a meaningless "0 of N row(s) selected."
          Checked via getAllLeafColumns().some(...) rather than
          table.getColumn("select") — TanStack's getColumn() logs a
          "[Table] Column with id 'x' does not exist." console error
          whenever the column isn't found, even though it just returns
          undefined; inspecting the columns array directly avoids that. */}
      <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
        {table.getAllLeafColumns().some((column) => column.id === "select") ? (
          <>
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </>
        ) : (
          <>&nbsp;</>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
        {/* Rows per page */}
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-18 data-size:h-8">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <div className="flex items-center justify-center font-medium text-sm whitespace-nowrap">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>

          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>

          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>

          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
