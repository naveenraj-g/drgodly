/**
 * MedicalRecordsClient — interactive shell for the patient Medical Records page.
 *
 * Layer: client / telemedicine / patient / component / medical-records
 *
 * Receives pre-fetched server data and handles:
 *   • Cross-referencing ServiceRequests ↔ DiagnosticReports ↔ Appointments
 *   • Filter tabs: All | Awaiting Upload | Uploaded
 *   • Stats bar (total orders, awaiting, uploaded, files)
 *   • Rendering ServiceRequestRecordCard list with all derived context
 *
 * "use client" is required for tab state.
 * Upload modal is already mounted in the patient layout (PatientModalProvider).
 */

"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordStatBar } from "./RecordStatBar";
import {
  ServiceRequestRecordCard,
  RecordListEmptyState,
} from "./ServiceRequestRecordCard";
import type { TServiceRequestResponse } from "@/modules/entities/schemas/service-request";
import type { TDiagnosticReportResponse } from "@/modules/entities/schemas/diagnostic-report";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Filter tab values. */
type FilterTab = "all" | "awaiting" | "uploaded";

export interface MedicalRecordsClientProps {
  /** All ServiceRequests for this patient (doctor orders). */
  serviceRequests: TServiceRequestResponse[];
  /** All DiagnosticReports for this patient (uploaded results). */
  diagnosticReports: TDiagnosticReportResponse[];
  /**
   * All appointments for this patient.
   * Used to build encounter_id → appointment context map for the cards.
   */
  appointments: TAppointmentResponse[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client shell for the Medical Records page.
 * Builds cross-reference maps, computes stats, and renders the filtered card list.
 *
 * @param serviceRequests  - All patient SR records.
 * @param diagnosticReports - All patient DR records (uploaded files).
 * @param appointments     - All patient appointments (for encounter context).
 */
export function MedicalRecordsClient({
  serviceRequests,
  diagnosticReports,
  appointments,
}: MedicalRecordsClientProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // ── Cross-reference maps ──────────────────────────────────────────────────

  /**
   * Map from ServiceRequest.id → DiagnosticReport[].
   * Built by scanning each DR's based_on[] for ServiceRequest references.
   */
  const drsByServiceRequestId = useMemo(() => {
    const map = new Map<number, TDiagnosticReportResponse[]>();
    for (const dr of diagnosticReports) {
      for (const ref of dr.based_on ?? []) {
        if (
          ref.reference_type === "ServiceRequest" &&
          ref.reference_id != null
        ) {
          const existing = map.get(ref.reference_id) ?? [];
          existing.push(dr);
          map.set(ref.reference_id, existing);
        }
      }
    }
    return map;
  }, [diagnosticReports]);

  /**
   * Map from encounter_id → TAppointmentResponse.
   * Appointment.encounter_id links an appointment to its FHIR Encounter,
   * which is the same encounter_id stored on each ServiceRequest.
   */
  const appointmentByEncounterId = useMemo(() => {
    const map = new Map<number, TAppointmentResponse>();
    for (const appt of appointments) {
      if (appt.encounter_id != null) {
        map.set(appt.encounter_id, appt);
      }
    }
    return map;
  }, [appointments]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    let awaiting = 0;
    let uploaded = 0;
    let totalFiles = 0;

    for (const sr of serviceRequests) {
      const drs = drsByServiceRequestId.get(sr.id) ?? [];
      const fileCount = drs.reduce(
        (sum, dr) => sum + (dr.presented_form?.length ?? 0),
        0,
      );
      totalFiles += fileCount;
      if (fileCount > 0) {
        uploaded++;
      } else {
        awaiting++;
      }
    }

    return { total: serviceRequests.length, awaiting, uploaded, totalFiles };
  }, [serviceRequests, drsByServiceRequestId]);

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filteredRequests = useMemo(() => {
    if (activeTab === "all") return serviceRequests;
    return serviceRequests.filter((sr) => {
      const drs = drsByServiceRequestId.get(sr.id) ?? [];
      const hasUploads = drs.some((dr) => (dr.presented_form?.length ?? 0) > 0);
      return activeTab === "uploaded" ? hasUploads : !hasUploads;
    });
  }, [serviceRequests, drsByServiceRequestId, activeTab]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <RecordStatBar
        total={stats.total}
        awaiting={stats.awaiting}
        uploaded={stats.uploaded}
        totalFiles={stats.totalFiles}
      />

      {/* Filter tabs — only shown when there are records */}
      {serviceRequests.length > 0 && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
        >
          <TabsList className="grid w-full grid-cols-3 max-w-sm">
            <TabsTrigger value="all">
              All
              {stats.total > 0 && (
                <span className="ml-1.5 tabular-nums text-xs opacity-60">
                  {stats.total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="awaiting">
              Awaiting
              {stats.awaiting > 0 && (
                <span className="ml-1.5 tabular-nums text-xs opacity-60">
                  {stats.awaiting}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="uploaded">
              Uploaded
              {stats.uploaded > 0 && (
                <span className="ml-1.5 tabular-nums text-xs opacity-60">
                  {stats.uploaded}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Card list */}
      {filteredRequests.length === 0 ? (
        <RecordListEmptyState filtered={activeTab !== "all"} />
      ) : (
        <div className="space-y-3 relative">
          {filteredRequests.map((sr) => {
            const drs = drsByServiceRequestId.get(sr.id) ?? [];
            const appointment =
              sr.encounter_id != null
                ? (appointmentByEncounterId.get(sr.encounter_id) ?? null)
                : null;

            return (
              <ServiceRequestRecordCard
                key={sr.id}
                sr={sr}
                diagnosticReports={drs}
                appointment={appointment}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
