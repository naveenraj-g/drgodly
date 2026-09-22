import { ChartColumn } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartEmptyStateProps {
  /** Matches the chart's own `height` prop so the card doesn't collapse/jump. */
  height: number;
  /** Override for a chart-specific message; falls back to a generic one. */
  message?: string;
  className?: string;
}

/**
 * Shared "no data" placeholder for every chart catalog component
 * (Bar/Line/Area/Pie/RadialBar/Composed). Renders in place of the chart
 * canvas when its resolved `data` array is empty, so a patient/record with
 * nothing to plot yet shows an intentional message instead of a blank card.
 */
export function ChartEmptyState({ height, message = "No data available", className }: ChartEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-muted-foreground",
        className,
      )}
      style={{ height }}
    >
      <ChartColumn className="size-7 opacity-40" />
      <p className="text-xs">{message}</p>
    </div>
  );
}
