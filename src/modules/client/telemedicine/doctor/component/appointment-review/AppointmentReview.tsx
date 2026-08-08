/**
 * AppointmentReview — post-consultation clinical review UI.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * Two-column layout:
 *   Left  — SoapEditor (editable SOAP note from the AI full-report-agent)
 *   Right — ClinicalExtractionPanel (Conditions, Observations, Medications, Orders)
 *
 * Pre-population:
 *   - On first visit: seeds form state from the AI full-report (fullReport prop).
 *   - On revisit: if the encounter already has FHIR resources saved (savedXxx props),
 *     rehydrates from those records so doctor edits are restored.
 *
 * On "Confirm & Save" the component diffs current state against what was loaded:
 *   - Items removed by the doctor  → DELETE
 *   - Items still present with a fhirId → UPDATE (code + status fields)
 *   - Newly added items (no fhirId) → CREATE
 */

"use client";

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CalendarDays, User, Loader2 } from "lucide-react";
import { SoapEditor } from "./soap/SoapEditor";
import { ClinicalExtractionPanel } from "./clinical/ClinicalExtractionPanel";
import { publishClinicalRecords } from "./publishClinicalRecords";
import {
  conditionFromFhir,
  medicationFromFhir,
  observationFromFhir,
  serviceRequestFromFhir,
} from "./fromFhir";
import type { ClinicalExtractionResult } from "./clinical/ClinicalExtractionPanel";
import type {
  SoapNote,
  ConditionFormItem,
  ObservationFormItem,
  MedicationFormItem,
  ServiceRequestFormItem,
  StagingReport,
} from "./types";
import type { TConditionResponse } from "@/modules/entities/schemas/condition";
import type { TObservationResponse } from "@/modules/entities/schemas/observation";
import type { TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";

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

// ── AI extraction → FormItem converters ──────────────────────────────────────

/** Converts an AI-extracted condition to a ConditionFormItem (no fhirId — will be CREATEd). */
function toConditionItem(c: {
  display: string;
  terminologySystem: string;
}): ConditionFormItem {
  return { ...c, id: crypto.randomUUID() };
}

/** Converts an AI-extracted observation to an ObservationFormItem (no fhirId — will be CREATEd). */
function toObservationItem(o: {
  display: string;
  terminologySystem: string;
  value?: string | null;
  unit?: string | null;
}): ObservationFormItem {
  return { ...o, id: crypto.randomUUID(), value: o.value ?? null, unit: o.unit ?? null };
}

/** Converts an AI-extracted medication to a MedicationFormItem (no fhirId — will be CREATEd). */
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

/** Converts an AI-extracted service request to a ServiceRequestFormItem (no fhirId — will be CREATEd). */
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
  /**
   * Existing FHIR Conditions linked to this encounter (from a previous save).
   * When non-empty, these take precedence over the AI extraction for initial state.
   */
  savedConditions?: TConditionResponse[];
  /** Existing FHIR Observations linked to this encounter. */
  savedObservations?: TObservationResponse[];
  /** Existing FHIR MedicationRequests linked to this encounter. */
  savedMedications?: TMedicationRequestResponse[];
  /** Existing FHIR ServiceRequests linked to this encounter. */
  savedServiceRequests?: TServiceRequestResponse[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Post-consultation review component.
 * Renders an editable SOAP note alongside AI-extracted FHIR clinical resources.
 * On confirm, diffs current state against loaded state and creates/updates/deletes accordingly.
 *
 * @param fhirAppointmentId - Numeric FHIR appointment ID.
 * @param patientId - Numeric FHIR patient ID (used as subject reference).
 * @param encounterId - Numeric FHIR encounter ID to link all resources.
 * @param patientName - Patient display name.
 * @param doctorName - Doctor display name.
 * @param appointmentDate - Formatted date string for the header.
 * @param fullReport - Raw AI full-report-agent output for pre-population.
 * @param savedConditions - Existing FHIR Conditions for this encounter (revisit).
 * @param savedObservations - Existing FHIR Observations for this encounter (revisit).
 * @param savedMedications - Existing FHIR MedicationRequests for this encounter (revisit).
 * @param savedServiceRequests - Existing FHIR ServiceRequests for this encounter (revisit).
 */
export function AppointmentReview({
  patientId,
  encounterId,
  patientName,
  doctorName,
  appointmentDate,
  fullReport,
  savedConditions = [],
  savedObservations = [],
  savedMedications = [],
  savedServiceRequests = [],
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

  /* Detect whether a previous save exists for this encounter. */
  const hasSaved =
    savedConditions.length > 0 ||
    savedObservations.length > 0 ||
    savedMedications.length > 0 ||
    savedServiceRequests.length > 0;

  /* Form state — rehydrate from saved FHIR records on revisit, else from AI report. */
  const [soap, setSoap] = useState<SoapNote>(report.soap);
  const [conditions, setConditions] = useState<ConditionFormItem[]>(
    hasSaved
      ? savedConditions.map(conditionFromFhir)
      : report.clinicalExtraction.conditions.map(toConditionItem),
  );
  const [observations, setObservations] = useState<ObservationFormItem[]>(
    hasSaved
      ? savedObservations.map(observationFromFhir)
      : report.clinicalExtraction.observations.map(toObservationItem),
  );
  const [medications, setMedications] = useState<MedicationFormItem[]>(
    hasSaved
      ? savedMedications.map(medicationFromFhir)
      : report.clinicalExtraction.medicationRequests.map(toMedicationItem),
  );
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestFormItem[]>(
    hasSaved
      ? savedServiceRequests.map(serviceRequestFromFhir)
      : report.clinicalExtraction.serviceRequests.map(toServiceRequestItem),
  );
  const [isPending, startTransition] = useTransition();

  /*
   * Track the FHIR IDs that were present at page load.
   * Used during save to detect which records the doctor deleted (present at load, absent now).
   */
  const initialFhirIds = useRef({
    conditions: new Set(savedConditions.map((c) => c.id)),
    observations: new Set(savedObservations.map((o) => o.id)),
    medications: new Set(savedMedications.map((m) => m.id)),
    serviceRequests: new Set(savedServiceRequests.map((s) => s.id)),
  });

  const subject = `Patient/${patientId}`;

  /** Re-populates all four lists when the doctor re-runs clinical extraction. */
  const handleReExtract = (result: ClinicalExtractionResult) => {
    setConditions(result.conditions.map(toConditionItem));
    setObservations(result.observations.map(toObservationItem));
    setMedications(result.medicationRequests.map(toMedicationItem));
    setServiceRequests(result.serviceRequests.map(toServiceRequestItem));
  };

  /**
   * Publishes the current form state to the EMR.
   * Delegates the diff (CREATE / UPDATE / DELETE per resource type) to
   * publishClinicalRecords, then stores the surviving fhirIds so a second save
   * in the same session diffs against the right baseline.
   */
  const handleConfirm = () => {
    startTransition(async () => {
      try {
        /* Diff current state against what was loaded and write to FHIR. */
        initialFhirIds.current = await publishClinicalRecords({
          conditions,
          observations,
          medications,
          serviceRequests,
          initialFhirIds: initialFhirIds.current,
          subject,
          encounterId,
        });

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
              {hasSaved
                ? "Previously saved records loaded — edit and save to sync changes"
                : "Confirm terminology codes — AI suggestions are pre-loaded"}
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
