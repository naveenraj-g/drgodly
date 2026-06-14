/**
 * IntakeReportSection — renders the AI-generated pre-intake report.
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Displays the clinical assessment report stored in Intake.report after the
 * patient completes a text or voice intake session. Used on both the patient
 * and doctor appointment detail pages.
 *
 * The report shape is flexible (stored as JSON with .passthrough()) so each
 * section is guarded before rendering. Unknown top-level keys are ignored.
 *
 * Report fields (all optional):
 *   clinical_overview   - narrative summary of the patient's condition
 *   risk_level          - "low" | "medium" | "high" | free text
 *   differential_diagnosis - array of possible diagnoses
 *   diagnostic_plan     - recommended tests / investigations
 *   treatment_plan      - recommended treatment approach
 *   red_flags           - urgent warning signs to watch for
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  AlertTriangle,
  Stethoscope,
  FlaskConical,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";
import { type TIntakeReport } from "@/modules/entities/schemas/intake";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Maps a risk level string to a Tailwind colour class for the badge.
 *
 * @param risk - Risk level string from the agent (case-insensitive).
 * @returns Tailwind class string for the badge.
 */
function riskClass(risk: string | undefined): string {
  switch (risk?.toLowerCase()) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

/** Props for IntakeReportSection. */
interface IntakeReportSectionProps {
  /** The intake AI report object. Null renders nothing. */
  report: TIntakeReport | null | undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the AI pre-intake report in a structured card layout.
 *
 * Each section is independently guarded — missing fields from older agent
 * versions are simply skipped without breaking the layout.
 *
 * @param report - AI report object from the Intake record.
 */
export function IntakeReportSection({ report }: IntakeReportSectionProps) {
  if (!report) return null;

  const hasContent =
    report.clinical_overview ||
    report.risk_level ||
    (report.differential_diagnosis?.length ?? 0) > 0 ||
    report.diagnostic_plan ||
    report.treatment_plan ||
    (report.red_flags?.length ?? 0) > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <Brain className="size-4 text-primary" />
        <h2 className="font-semibold text-sm">AI Pre-Intake Assessment</h2>
        {report.risk_level && (
          <Badge variant="outline" className={riskClass(report.risk_level)}>
            {report.risk_level} risk
          </Badge>
        )}
      </div>

      {/* Clinical Overview */}
      {report.clinical_overview && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" />
              Clinical Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm leading-relaxed">{report.clinical_overview}</p>
          </CardContent>
        </Card>
      )}

      {/* Differential Diagnosis */}
      {report.differential_diagnosis && report.differential_diagnosis.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="size-4 text-muted-foreground" />
              Differential Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-1.5">
              {report.differential_diagnosis.map((dx, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {dx}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Plan */}
      {report.diagnostic_plan && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="size-4 text-muted-foreground" />
              Diagnostic Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {report.diagnostic_plan}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Treatment Plan */}
      {report.treatment_plan && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              Treatment Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {report.treatment_plan}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Red Flags */}
      {report.red_flags && report.red_flags.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
              <ShieldAlert className="size-4" />
              Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ul className="space-y-1.5">
              {report.red_flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />
    </div>
  );
}
