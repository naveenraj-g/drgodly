/**
 * IntakeInsights — doctor-side panel showing pre-appointment intake data.
 *
 * Layer: client / telemedicine / doctor / intake
 *
 * Displays the patient's intake conversation transcript and AI-generated
 * clinical assessment report for a specific FHIR appointment.
 *
 * Usage: embed this in an appointment detail view, passing the FHIR
 * appointment ID. The component fetches the linked intake via
 * getIntakeByFhirAppointmentIdAction and renders:
 *   - Risk level badge
 *   - Clinical overview
 *   - Differential diagnosis list
 *   - Diagnostic + treatment plans
 *   - Red flags
 *   - Full conversation transcript (collapsed by default)
 *
 * Returns null (renders nothing) when no intake is linked to the appointment.
 */

"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getIntakeByFhirAppointmentIdAction } from "@/modules/server/presentation/actions/intake";
import type { TIntakeResponse, TIntakeReport } from "@/modules/entities/schemas/intake";

/** Props for IntakeInsights. */
interface IntakeInsightsProps {
  /** FHIR Appointment.id — used to look up the linked intake. */
  fhirAppointmentId: number;
}

/** Maps AI risk level strings to Badge colour classes. */
const RISK_CLASS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-200 text-red-900 border-red-300",
};

// ── Polymorphic field renderers ───────────────────────────────────────────────
// The AI agent can return strings OR structured objects for several fields.
// Each renderer below handles both shapes gracefully.

/**
 * Renders one differential-diagnosis entry.
 * Handles both plain string and {condition, rationale, likelihood} object.
 */
function DiffDiagItem({ item, index }: { item: unknown; index: number }) {
  if (typeof item === "string") {
    return (
      <li key={index} className="text-sm flex items-start gap-2">
        <span className="text-primary font-bold mt-0.5">·</span>
        {item}
      </li>
    );
  }
  if (item && typeof item === "object") {
    const d = item as Record<string, unknown>;
    return (
      <li key={index} className="text-sm border-l-2 border-primary/20 pl-2 space-y-0.5">
        {d.condition != null && (
          <p className="font-medium text-foreground">{String(d.condition)}</p>
        )}
        {d.rationale != null && (
          <p className="text-xs text-muted-foreground">{String(d.rationale)}</p>
        )}
        {d.likelihood != null && (
          <Badge variant="outline" className="text-[10px] w-fit">
            {String(d.likelihood)}
          </Badge>
        )}
      </li>
    );
  }
  return null;
}

/**
 * Renders a plan field (diagnostic_plan or treatment_plan).
 * Handles plain string, and structured objects whose values are strings or
 * string arrays (e.g. {imaging: [...], laboratory_tests: [...], other: [...]}).
 */
function PlanField({ value }: { value: unknown }) {
  if (typeof value === "string") {
    return <p className="text-sm leading-relaxed">{value}</p>;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v != null,
    );
    return (
      <div className="space-y-2">
        {entries.map(([key, val]) => (
          <div key={key}>
            <p className="text-xs font-medium text-muted-foreground capitalize mb-0.5">
              {key.replace(/_/g, " ")}
            </p>
            {Array.isArray(val) ? (
              <ul className="space-y-0.5">
                {(val as unknown[]).map((it, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">·</span>
                    {String(it)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed">{String(val)}</p>
            )}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

/**
 * Renders one red-flag entry.
 * Handles both plain string and arbitrary objects (joins string values with " — ").
 */
function RedFlagItem({ flag, index }: { flag: unknown; index: number }) {
  let text: string;
  if (typeof flag === "string") {
    text = flag;
  } else if (flag && typeof flag === "object") {
    // Join all string values in the object (e.g. {flag: "...", severity: "..."})
    text =
      Object.values(flag as Record<string, unknown>)
        .filter((v) => typeof v === "string")
        .join(" — ") || JSON.stringify(flag);
  } else {
    return null;
  }
  return (
    <li key={index} className="text-sm text-red-700 flex items-start gap-2">
      <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
      {text}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the AI clinical assessment section.
 *
 * @param report - Parsed intake report object.
 */
function ReportSection({ report }: { report: TIntakeReport }) {
  const riskKey = (report.risk_level ?? "").toLowerCase();

  return (
    <div className="space-y-4">
      {/* Risk level */}
      {report.risk_level && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Risk Level
          </span>
          <Badge variant="outline" className={RISK_CLASS[riskKey] ?? ""}>
            {report.risk_level}
          </Badge>
        </div>
      )}

      {/* Clinical overview */}
      {report.clinical_overview && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Clinical Overview
          </p>
          <p className="text-sm leading-relaxed">{report.clinical_overview}</p>
        </div>
      )}

      {/* Differential diagnosis — items may be strings or {condition, rationale, likelihood} */}
      {report.differential_diagnosis && report.differential_diagnosis.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Differential Diagnosis
          </p>
          <ul className="space-y-2">
            {report.differential_diagnosis.map((item, i) => (
              <DiffDiagItem key={i} item={item} index={i} />
            ))}
          </ul>
        </div>
      )}

      {/* Diagnostic plan — may be a string or structured object */}
      {report.diagnostic_plan != null && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Diagnostic Plan
          </p>
          <PlanField value={report.diagnostic_plan} />
        </div>
      )}

      {/* Treatment plan — may be a string or structured object */}
      {report.treatment_plan != null && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Treatment Plan
          </p>
          <PlanField value={report.treatment_plan} />
        </div>
      )}

      {/* Red flags — items may be strings or structured objects */}
      {report.red_flags && report.red_flags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="size-3" />
            Red Flags
          </p>
          <ul className="space-y-1">
            {report.red_flags.map((flag, i) => (
              <RedFlagItem key={i} flag={flag} index={i} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Fetches and displays the intake report linked to the given appointment.
 * Returns null if no intake was linked.
 *
 * @param fhirAppointmentId - FHIR Appointment.id to look up.
 */
export function IntakeInsights({ fhirAppointmentId }: IntakeInsightsProps) {
  const [intake, setIntake] = useState<TIntakeResponse | null | undefined>(
    undefined, // undefined = loading, null = not found
  );
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [data] = await getIntakeByFhirAppointmentIdAction({
        payload: { fhir_appointment_id: fhirAppointmentId },
      });
      setIntake(data ?? null);
    }
    load();
  }, [fhirAppointmentId]);

  // Loading state
  if (intake === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  // No linked intake — appointment was booked directly
  if (!intake) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          Pre-Appointment Intake
          <Badge variant="outline" className="text-[10px] ml-auto">
            {intake.mode === "VOICE" ? "Voice" : "Text"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* AI report */}
        {intake.report ? (
          <ReportSection report={intake.report} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No clinical report available for this intake.
          </p>
        )}

        {/* Transcript toggle */}
        {intake.conversation && intake.conversation.length > 0 && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs text-muted-foreground"
              onClick={() => setTranscriptOpen((v) => !v)}
            >
              <span>
                View Transcript ({intake.conversation.length} messages)
              </span>
              {transcriptOpen ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </Button>

            {transcriptOpen && (
              <ScrollArea className="mt-2 h-64 border rounded-md px-3 py-2 bg-muted/20">
                <div className="space-y-3">
                  {intake.conversation.map((msg, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-semibold shrink-0 mt-0.5 uppercase",
                          msg.role === "user"
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {msg.role === "user" ? "Patient" : "AI"}
                      </span>
                      <p className="text-xs text-foreground leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
