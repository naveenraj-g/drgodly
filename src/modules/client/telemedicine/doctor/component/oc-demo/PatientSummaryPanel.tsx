/**
 * @file PatientSummaryPanel.tsx
 * @description Left column of the oc-demo page — AI pre-visit summary, key
 * vitals, medications, allergies, history, and recent labs, behind a small
 * tab strip (Patient Summary / AI Intake / History / Vitals / Documents).
 * All content is mock data (see mockOcData.ts).
 * @layer client/telemedicine/doctor/component/oc-demo
 */

"use client";

import { Sparkles, HeartPulse, Pill, ShieldAlert, History as HistoryIcon, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MOCK_AI_SUMMARY,
  MOCK_ALLERGIES,
  MOCK_HISTORY,
  MOCK_LABS,
  MOCK_MEDICATIONS,
  MOCK_VITALS,
} from "./mockOcData";

const TABS = ["Patient Summary", "AI Intake", "History", "Vitals", "Documents"] as const;

/** Renders the left column's tabbed patient information panel. */
export function PatientSummaryPanel() {
  return (
    <Tabs defaultValue={TABS[0]} className="h-full">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="text-xs">
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="Patient Summary" className="space-y-3 mt-3">
        {/* AI Pre-Visit Summary */}
        <Card className="p-3.5 gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-violet-600" />
              AI Pre-Visit Summary
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              View Full Report
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{MOCK_AI_SUMMARY.generatedLabel}</p>
          <p className="text-sm">{MOCK_AI_SUMMARY.text}</p>
        </Card>

        {/* Key vitals */}
        <Card className="p-3.5 gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <HeartPulse className="size-4 text-rose-600" />
              Key Vitals (Patient Reported)
            </div>
            <span className="text-xs text-muted-foreground">{MOCK_VITALS.reportedAt}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_VITALS.items.map((vital) => (
              <div key={vital.label} className="rounded-lg border bg-muted/40 p-2">
                <div className="text-[11px] font-medium text-muted-foreground">
                  {vital.label}
                </div>
                <div className="text-sm font-semibold">{vital.value}</div>
                {vital.unit && (
                  <div className="text-[11px] text-muted-foreground">{vital.unit}</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Medications */}
        <Card className="p-3.5 gap-1.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Pill className="size-4 text-blue-600" />
            Current Medications
          </div>
          <ul className="text-sm list-disc pl-5 space-y-0.5">
            {MOCK_MEDICATIONS.map((med) => (
              <li key={med}>{med}</li>
            ))}
          </ul>
        </Card>

        {/* Allergies */}
        <Card className="p-3.5 gap-1.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldAlert className="size-4 text-amber-600" />
            Allergies
          </div>
          <p className="text-sm">{MOCK_ALLERGIES}</p>
        </Card>

        {/* Relevant history */}
        <Card className="p-3.5 gap-1.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <HistoryIcon className="size-4 text-slate-600" />
            Relevant History
          </div>
          <ul className="text-sm list-disc pl-5 space-y-0.5">
            {MOCK_HISTORY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        {/* Recent labs & reports */}
        <Card className="p-3.5 gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <FileText className="size-4 text-indigo-600" />
              Recent Labs & Reports
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              View All
            </Button>
          </div>
          <div className="space-y-1.5">
            {MOCK_LABS.map((lab) => (
              <div key={lab.name} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{lab.name}</div>
                  <div className="text-xs text-muted-foreground">{lab.date}</div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    lab.status === "Normal"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-sky-100 text-sky-700 border-sky-200"
                  }
                >
                  {lab.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>

      {/* Secondary tabs — lighter placeholders, reusing the same mock data */}
      <TabsContent value="AI Intake" className="mt-3">
        <Card className="p-3.5 text-sm text-muted-foreground">
          {MOCK_AI_SUMMARY.text}
        </Card>
      </TabsContent>
      <TabsContent value="History" className="mt-3">
        <Card className="p-3.5">
          <ul className="text-sm list-disc pl-5 space-y-0.5">
            {MOCK_HISTORY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </TabsContent>
      <TabsContent value="Vitals" className="mt-3">
        <Card className="p-3.5 grid grid-cols-2 gap-2">
          {MOCK_VITALS.items.map((vital) => (
            <div key={vital.label} className="rounded-lg border bg-muted/40 p-2">
              <div className="text-[11px] font-medium text-muted-foreground">
                {vital.label}
              </div>
              <div className="text-sm font-semibold">{vital.value}</div>
            </div>
          ))}
        </Card>
      </TabsContent>
      <TabsContent value="Documents" className="mt-3">
        <Card className="p-3.5 space-y-1.5">
          {MOCK_LABS.map((lab) => (
            <div key={lab.name} className="flex items-center justify-between text-sm">
              <span className="font-medium">{lab.name}</span>
              <span className="text-xs text-muted-foreground">{lab.date}</span>
            </div>
          ))}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
