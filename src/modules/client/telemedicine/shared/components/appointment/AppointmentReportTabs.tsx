/**
 * AppointmentReportTabs — two-tab layout for the appointment detail page.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Tabs:
 *   "Intake Report"  — AI pre-intake assessment (IntakeReportSection)
 *   "Doctor Report"  — Post-consultation SOAP note + confirmed FHIR records
 *                      (DoctorReportSection)
 *
 * Used on both the doctor and patient appointment detail pages.
 * This is a client component because shadcn Tabs requires React state.
 * All data is received as props from the server page.
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Stethoscope } from "lucide-react";
import { IntakeReportSection } from "./IntakeReportSection";
import { DoctorReportSection, type DoctorReportSectionProps } from "./DoctorReportSection";
import type { TIntakeResponse } from "@/modules/entities/schemas/intake";

// ── Props ─────────────────────────────────────────────────────────────────────

/** Combined props for the two-tab report layout. */
interface AppointmentReportTabsProps {
  /**
   * Full intake record for the Intake Report tab.
   * Passed directly to IntakeReportSection which handles its own empty state.
   */
  intake: TIntakeResponse | null | undefined;
  /**
   * Doctor report data for the Doctor Report tab.
   * Passed directly to DoctorReportSection which handles its own empty state.
   */
  doctorReport: DoctorReportSectionProps;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Two-tab card layout showing the AI intake report and the doctor's
 * post-consultation report side by side.
 *
 * @param intake - Intake record (AI pre-intake assessment + conversation).
 * @param doctorReport - Doctor report data (SOAP + FHIR records).
 */
export function AppointmentReportTabs({
  intake,
  doctorReport,
}: AppointmentReportTabsProps) {
  return (
    <Tabs defaultValue="intake" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="intake" className="flex items-center gap-1.5">
          <Brain className="size-3.5" />
          Intake Report
        </TabsTrigger>
        <TabsTrigger value="doctor" className="flex items-center gap-1.5">
          <Stethoscope className="size-3.5" />
          Doctor Report
        </TabsTrigger>
      </TabsList>

      {/* Intake Report tab */}
      <TabsContent value="intake" className="mt-4">
        <IntakeReportSection intake={intake} />
      </TabsContent>

      {/* Doctor Report tab */}
      <TabsContent value="doctor" className="mt-4">
        <DoctorReportSection {...doctorReport} />
      </TabsContent>
    </Tabs>
  );
}
