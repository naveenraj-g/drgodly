/**
 * PlanDefinitionCard — one selectable plan in the preventive confirm dialog.
 *
 * Layer: client / telemedicine / doctor / modals / appointments / preventive
 *
 * Shows the plan's title / description. "View more" expands the plan's actions,
 * each resolved to the ActivityDefinition it will turn into a ServiceRequest.
 */

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { TPlanDefinitionResponse } from "@/modules/entities/schemas/plan-definition";
import type { TActivityDefinitionResponse } from "@/modules/entities/schemas/activity-definition";
import { parseActivityDefinitionId } from "./preventiveQueries";

interface IPlanDefinitionCardProps {
  plan: TPlanDefinitionResponse;
  selected: boolean;
  /** id → ActivityDefinition, for readable action names. */
  activities: Record<number, TActivityDefinitionResponse>;
  onSelect: () => void;
}

/**
 * Selectable plan card with an expandable list of its actions.
 */
export function PlanDefinitionCard({
  plan,
  selected,
  activities,
  onSelect,
}: IPlanDefinitionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const actions = plan.action ?? [];

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      {/* Selecting the card is the primary click target; "View more" is separate. */}
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{plan.title ?? plan.name ?? `Plan #${plan.id}`}</span>
          <Badge variant="secondary">{actions.length} actions</Badge>
        </div>
        {plan.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
        )}
      </button>

      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="link" size="sm" className="h-auto px-0 pt-2">
            {expanded ? "View less" : "View more"}
            <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 space-y-2 border-l pl-3">
            {actions.length === 0 && (
              <li className="text-sm text-muted-foreground">This plan has no actions.</li>
            )}
            {actions.map((action) => {
              // Resolve the action's ActivityDefinition for a readable name.
              const activityId = parseActivityDefinitionId(action.definition_canonical);
              const activity = activityId != null ? activities[activityId] : undefined;
              return (
                <li key={action.id} className="text-sm">
                  <div className="font-medium">
                    {action.title ?? activity?.title ?? activity?.name ?? "Untitled action"}
                  </div>
                  {activity && (
                    <div className="text-muted-foreground">
                      {activity.title ?? activity.name}
                      {activity.description ? ` — ${activity.description}` : ""}
                    </div>
                  )}
                  {!activity && action.description && (
                    <div className="text-muted-foreground">{action.description}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
