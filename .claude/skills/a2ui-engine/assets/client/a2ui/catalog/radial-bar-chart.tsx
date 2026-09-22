"use client";

import { useRef, useState } from "react";
import {
  RadialBarChart as RechartsRadialBar,
  RadialBar,
  PolarGrid,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportDialog } from "../components/export-dialog";
import { ChartEmptyState } from "./chart-empty-state";
import { useDynamicComponent } from "../hooks/use-dynamic-component";
import type { RadialBarChartNode } from "../types";
import type { IMessageProcessor } from "../rendering/processor";

const PALETTE = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#6366f1", "#ef4444", "#14b8a6",
];

interface Props {
  processor: IMessageProcessor;
  surfaceId: string;
  component: RadialBarChartNode;
  weight?: string | number;
}

/**
 * Radial bar chart — same {label, value, color?} data shape as PieChart, but
 * rendered as concentric progress rings. Reads better than a pie for a small
 * set of proportions/scores (sleep-stage composition, a goal-completion
 * ring, etc.), since each ring's fill length is directly comparable.
 */
export function RadialBarChart({ processor, surfaceId, component, weight = "initial" }: Props) {
  const { resolvePrimitive } = useDynamicComponent(processor, surfaceId, component, weight);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const data: Array<{ label: string; value: number; color?: string }> =
    resolvePrimitive(component.properties.data) ?? [];
  const innerRadius = component.properties.innerRadius ?? 20;
  const outerRadius = component.properties.outerRadius ?? 90;
  const height = component.properties.height ?? 260;
  const showLegend = component.properties.showLegend ?? true;
  const exportable = component.properties.exportable !== false && data.length > 0;

  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.label,
      { label: d.label, color: d.color ?? PALETTE[i % PALETTE.length] },
    ]),
  );

  // Recharts RadialBar reads one numeric field per ring — "value" here,
  // fill resolved per-entry so each ring gets its own color.
  const chartData = data.map((d, i) => ({
    name: d.label,
    value: d.value,
    fill: d.color ?? PALETTE[i % PALETTE.length],
  }));

  return (
    <div
      className={cn("relative group", component.className)}
      style={{ flex: weight }}
      ref={containerRef}
    >
      {exportable && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 z-10 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-3 w-3" />
        </Button>
      )}

      <div style={{ width: "100%", height }}>
        {data.length === 0 ? (
          <ChartEmptyState height={height} />
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full !aspect-auto">
            <RechartsRadialBar
              data={chartData}
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              startAngle={90}
              endAngle={-270}
            >
              <PolarGrid gridType="circle" radialLines={false} stroke="hsl(var(--border))" />
              <RadialBar dataKey="value" background cornerRadius={6} />
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              {showLegend && (
                <Legend
                  iconSize={8}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: 11 }}
                />
              )}
            </RechartsRadialBar>
          </ChartContainer>
        )}
      </div>

      {exportable && (
        <ExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          mode="chart"
          options={{ containerRef, title: component.properties.title }}
        />
      )}
    </div>
  );
}
