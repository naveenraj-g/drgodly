/**
 * AppointmentReview — post-consultation clinical review UI.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * Two-column layout:
 *   Left  — SoapEditor (editable SOAP note from the AI full-report-agent)
 *   Right — ClinicalExtractionPanel (Conditions, Observations, Medications, Orders)
 *
 * On "Confirm & Save", the doctor's review is persisted to FHIR by calling
 * individual create actions (createConditionAction, createObservationAction,
 * createMedicationRequestAction, createServiceRequestAction) in parallel.
 * The encounter_id and subject (Patient/<id>) are passed to each resource.
 *
 * Pre-population:
 *   - fullReport (from consultation) seeds the SOAP note and clinical extraction lists.
 *   - If the encounter already has saved FHIR resources (re-visit case), those are
 *     loaded via the `savedXxx` props and rehydrated into form items.
 */

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CalendarDays, User, Loader2 } from "lucide-react";
import { SoapEditor } from "./soap/SoapEditor";
import { ClinicalExtractionPanel } from "./clinical/ClinicalExtractionPanel";
import { createConditionAction } from "@/modules/server/presentation/actions/condition/core.actions";
import { createObservationAction } from "@/modules/server/presentation/actions/observation/core.actions";
import { createMedicationRequestAction } from "@/modules/server/presentation/actions/medication-request/core.actions";
import { createServiceRequestAction } from "@/modules/server/presentation/actions/service-request/core.actions";
import type { ClinicalExtractionResult } from "./clinical/ClinicalExtractionPanel";
import type {
  SoapNote,
  ConditionFormItem,
  ObservationFormItem,
  MedicationFormItem,
  ServiceRequestFormItem,
  StagingReport,
} from "./types";

// ── Default / empty SOAP ──────────────────────────────────────────────────────

/** Blank SOAP note used when the AI did not generate one. */
const EMPTY_SOAP: SoapNote = {
  subjective: {
    chief_complaint: "",
    history_of_present_illness: "",
    associated_symptoms: [],
  },
  objective: { observations: [] },
  assessment: { possible_conditions: [], clinical_reasoning: "" },
  plan: { next_steps: [], when_to_seek_care: "" },
  summary: "",
};

// ── Converters: AI extraction shape → form item ───────────────────────────────

function toConditionItem(c: {
  display: string;
  terminologySystem: string;
}): ConditionFormItem {
  return { ...c, id: crypto.randomUUID() };
}

/* value/unit are optional in the ClinicalExtractionResult shape — normalize to null. */
function toObservationItem(o: {
  display: string;
  terminologySystem: string;
  value?: string | null;
  unit?: string | null;
}): ObservationFormItem {
  return { ...o, id: crypto.randomUUID(), value: o.value ?? null, unit: o.unit ?? null };
}

/* Dosage fields are optional in the ClinicalExtractionResult shape — normalize to null. */
function toMedicationItem(m: {
  display: string;
  terminologySystem: string;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
}): MedicationFormItem {
  return {
    ...m,
    id: crypto.randomUUID(),
    dose: m.dose ?? null,
    frequency: m.frequency ?? null,
    duration: m.duration ?? null,
    route: m.route ?? null,
  };
}

function toServiceRequestItem(s: {
  display: string;
  terminologySystem: string;
}): ServiceRequestFormItem {
  return { ...s, id: crypto.randomUUID() };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppointmentReviewProps {
  /** FHIR appointment integer ID — used in create action payloads. */
  fhirAppointmentId: number;
  /** FHIR patient integer ID — used as "Patient/<id>" subject on resources. */
  patientId: number;
  /** FHIR encounter integer ID — linked to each created FHIR resource. */
  encounterId: number;
  /** Patient display name shown in the header. */
  patientName: string;
  /** Doctor display name shown in the header. */
  doctorName: string;
  /** Appointment date string for display. */
  appointmentDate?: string | null;
  /**
   * Full report from the AI full-report-agent (stored on the Consultation record).
   * Contains the SOAP note and clinical extraction seeds.
   */
  fullReport?: unknown;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Post-consultation review component.
 * Renders an editable SOAP note alongside AI-extracted FHIR clinical resources.
 * On confirm, writes each resource individually to FHIR via server actions.
 *
 * @param fhirAppointmentId - Numeric FHIR appointment ID.
 * @param patientId - Numeric FHIR patient ID (used as subject reference).
 * @param encounterId - Numeric FHIR encounter ID to link all resources.
 * @param patientName - Patient display name.
 * @param doctorName - Doctor display name.
 * @param appointmentDate - Formatted date string for the header.
 * @param fullReport - Raw AI full-report-agent output for pre-population.
 */
export function AppointmentReview({
  patientId,
  encounterId,
  patientName,
  doctorName,
  appointmentDate,
  fullReport,
}: AppointmentReviewProps) {
  const rawReport =
    fullReport && typeof fullReport === "object"
      ? (fullReport as Partial<StagingReport>)
      : null;

  /* Seed SOAP note and clinical extraction lists from the AI report. */
  const report: StagingReport = {
    soap: rawReport?.soap ?? EMPTY_SOAP,
    clinicalExtraction: {
      conditions: rawReport?.clinicalExtraction?.conditions ?? [],
      observations: rawReport?.clinicalExtraction?.observations ?? [],
      medicationRequests: rawReport?.clinicalExtraction?.medicationRequests ?? [],
      serviceRequests: rawReport?.clinicalExtraction?.serviceRequests ?? [],
    },
  };

  const [soap, setSoap] = useState<SoapNote>(report.soap);
  const [conditions, setConditions] = useState<ConditionFormItem[]>(
    report.clinicalExtraction.conditions.map(toConditionItem),
  );
  const [observations, setObservations] = useState<ObservationFormItem[]>(
    report.clinicalExtraction.observations.map(toObservationItem),
  );
  const [medications, setMedications] = useState<MedicationFormItem[]>(
    report.clinicalExtraction.medicationRequests.map(toMedicationItem),
  );
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestFormItem[]>(
    report.clinicalExtraction.serviceRequests.map(toServiceRequestItem),
  );
  const [isPending, startTransition] = useTransition();

  const subject = `Patient/${patientId}`;

  /** Re-populates all four lists when the doctor re-runs clinical extraction. */
  const handleReExtract = (result: ClinicalExtractionResult) => {
    setConditions(result.conditions.map(toConditionItem));
    setObservations(result.observations.map(toObservationItem));
    setMedications(result.medicationRequests.map(toMedicationItem));
    setServiceRequests(result.serviceRequests.map(toServiceRequestItem));
  };

  /**
   * Saves all reviewed FHIR resources in parallel.
   * Each resource type calls its own create action independently.
   * Partial failures are reported without blocking the others.
   */
  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await Promise.all([
          /* ── Conditions ── */
          ...conditions.map((item) =>
            createConditionAction({
              payload: {
                clinical_status_code: item.clinicalStatus ?? "active",
                verification_status_code: item.verificationStatus ?? "confirmed",
                code_code: item.resolved?.code,
                code_system: item.resolved?.system,
                code_display: item.resolved?.display ?? item.display,
                code_text: item.display,
                subject,
                encounter_id: encounterId,
              },
            }),
          ),

          /* ── Observations ── */
          ...observations.map((item) => {
            const rawValue = item.editedValue ?? item.value ?? null;
            const numericValue = rawValue !== null ? parseFloat(rawValue) : undefined;
            const isNumeric = numericValue !== undefined && !isNaN(numericValue);
            return createObservationAction({
              payload: {
                status: item.status ?? "final",
                code_code: item.resolved?.code,
                code_system: item.resolved?.system,
                code_display: item.resolved?.display ?? item.display,
                code_text: item.display,
                ...(isNumeric
                  ? {
                      value_quantity_value: numericValue,
                      value_quantity_unit: item.editedUnit ?? item.unit ?? undefined,
                    }
                  : {
                      value_string: rawValue ?? item.display,
                    }),
                subject,
                encounter_id: encounterId,
              },
            });
          }),

          /* ── Medication requests ── */
          ...medications.map((item) =>
            createMedicationRequestAction({
              payload: {
                status: item.status ?? "active",
                intent: item.intent ?? "order",
                medication_code_code: item.resolved?.code,
                medication_code_system: item.resolved?.system,
                medication_code_display: item.resolved?.display ?? item.display,
                medication_code_text: item.display,
                subject,
                encounter_id: encounterId,
                dosage_instruction: [
                  {
                    text: item.editedDose ?? item.dose ?? undefined,
                    route_display: item.editedRoute ?? item.route ?? undefined,
                    timing_code_display:
                      item.editedFrequency ?? item.frequency ?? undefined,
                  },
                ],
              },
            }),
          ),

          /* ── Service requests ── */
          ...serviceRequests.map((item) =>
            createServiceRequestAction({
              payload: {
                status: item.status ?? "active",
                intent: item.intent ?? "order",
                code_code: item.resolved?.code,
                code_system: item.resolved?.system,
                code_display: item.resolved?.display ?? item.display,
                code_text: item.display,
                priority: item.priority ?? undefined,
                subject,
                encounter_id: encounterId,
              },
            }),
          ),
        ]);

        toast.success("Clinical records saved to patient medical history.");
      } catch (err) {
        console.error("[AppointmentReview] save failed:", err);
        toast.error("Failed to save some records. Please try again.");
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-156px)] gap-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-semibold">Post-Consultation Review</p>
            <p className="text-xs text-muted-foreground">
              Review and confirm AI-generated clinical data before saving to records
            </p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{patientName}</span>
          </div>
          {appointmentDate && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{appointmentDate}</span>
              </div>
            </>
          )}
          <Badge variant="secondary" className="text-xs">
            Dr. {doctorName}
          </Badge>
        </div>

        <Button
          onClick={handleConfirm}
          size="sm"
          className="gap-2"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {isPending ? "Saving..." : "Confirm & Save to Records"}
        </Button>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left: SOAP editor */}
        <div className="w-[420px] shrink-0 border-r flex flex-col min-h-0">
          <div className="px-4 py-3 border-b shrink-0">
            <p className="text-sm font-medium">SOAP Note</p>
            <p className="text-xs text-muted-foreground">
              Edit and review clinical notes
            </p>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              <SoapEditor soap={soap} onChange={setSoap} />
            </div>
          </ScrollArea>
        </div>

        {/* Right: Clinical extraction panel */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-4 py-3 border-b shrink-0">
            <p className="text-sm font-medium">Clinical Extraction</p>
            <p className="text-xs text-muted-foreground">
              Confirm terminology codes — AI suggestions are pre-loaded
            </p>
          </div>
          <div className="flex-1 min-h-0 p-4">
            <ClinicalExtractionPanel
              soap={soap}
              assessment={rawReport?.assessment}
              conditions={conditions}
              observations={observations}
              medications={medications}
              serviceRequests={serviceRequests}
              onConditionsChange={setConditions}
              onObservationsChange={setObservations}
              onMedicationsChange={setMedications}
              onServiceRequestsChange={setServiceRequests}
              onReExtract={handleReExtract}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
