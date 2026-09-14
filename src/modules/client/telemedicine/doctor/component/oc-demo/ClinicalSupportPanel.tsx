/**
 * @file ClinicalSupportPanel.tsx
 * @description Right column of the oc-demo page — AI clinical assessment
 * (ranked differential + risk badge), recommended next steps checklist, red
 * flags, relevant guidelines, and the AI assistant input box. All content is
 * mock data (see mockOcData.ts).
 * @layer client/telemedicine/doctor/component/oc-demo
 */

"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, Send, Sparkles, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MOCK_GUIDELINES,
  MOCK_LIKELY_CAUSES,
  MOCK_NEXT_STEPS,
  MOCK_RED_FLAGS,
  MOCK_RISK_LABEL,
} from "./mockOcData";

const TABS = ["Clinical Decision Support", "AI Insights", "Medications", "Investigations"] as const;

/** Renders the right column's AI clinical-decision-support panel. */
export function ClinicalSupportPanel() {
  const [checked, setChecked] = useState<boolean[]>(
    MOCK_NEXT_STEPS.map((step) => step.checked),
  );
  const [assistantInput, setAssistantInput] = useState("");

  return (
    <Tabs defaultValue={TABS[0]} className="h-full">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="text-xs">
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="Clinical Decision Support" className="space-y-3 mt-3">
        {/* AI clinical assessment */}
        <Card className="p-3.5 gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Stethoscope className="size-4 text-indigo-600" />
              AI Clinical Assessment
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200" variant="outline">
              {MOCK_RISK_LABEL}
            </Badge>
          </div>

          <p className="text-xs font-medium text-muted-foreground mt-1">
            Most Likely Causes (based on history &amp; presentation)
          </p>
          <div className="space-y-2">
            {MOCK_LIKELY_CAUSES.map((cause) => (
              <div key={cause.rank} className="flex items-center gap-2 text-sm">
                <span className="text-xs font-semibold text-muted-foreground w-3 shrink-0">
                  {cause.rank}
                </span>
                <span className="flex-1 truncate">{cause.name}</span>
                <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${cause.percent}%` }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums w-8 text-right shrink-0">
                  {cause.percent}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recommended next steps */}
        <Card className="p-3.5 gap-2">
          <div className="text-sm font-semibold">Recommended Next Steps</div>
          <div className="space-y-2">
            {MOCK_NEXT_STEPS.map((step, index) => (
              <label key={step.label} className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={checked[index]}
                  onCheckedChange={(value) =>
                    setChecked((prev) =>
                      prev.map((c, i) => (i === index ? value === true : c)),
                    )
                  }
                  className="mt-0.5"
                />
                <span>{step.label}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Red flags + guidelines */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3.5 gap-1.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <AlertTriangle className="size-4 text-red-600" />
              Red Flag Alerts
            </div>
            <ul className="text-xs list-disc pl-4 space-y-0.5 text-muted-foreground">
              {MOCK_RED_FLAGS.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-3.5 gap-1.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <BookOpen className="size-4 text-blue-600" />
              Relevant Guidelines
            </div>
            <ul className="text-xs space-y-0.5">
              {MOCK_GUIDELINES.map((guideline) => (
                <li key={guideline}>
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {guideline}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* AI assistant */}
        <Card className="p-3.5 gap-2 bg-violet-50/60 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-violet-600" />
            DrGodly AI Assistant
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              placeholder="Ask for differential diagnosis, dose adjustments, guideline recommendations, or patient education resources…"
              className="h-8 text-xs"
            />
            <Button size="icon" className="size-8 shrink-0">
              <Send className="size-3.5" />
            </Button>
          </div>
        </Card>
      </TabsContent>

      {/* Secondary tabs — lightweight placeholders */}
      <TabsContent value="AI Insights" className="mt-3">
        <Card className="p-3.5 text-sm text-muted-foreground">
          Same AI assessment as Clinical Decision Support, distilled to key
          insights for a quick scan.
        </Card>
      </TabsContent>
      <TabsContent value="Medications" className="mt-3">
        <Card className="p-3.5 text-sm text-muted-foreground">
          No medication changes suggested yet for this visit.
        </Card>
      </TabsContent>
      <TabsContent value="Investigations" className="mt-3">
        <Card className="p-3.5 text-sm text-muted-foreground">
          No investigations ordered yet for this visit.
        </Card>
      </TabsContent>
    </Tabs>
  );
}
