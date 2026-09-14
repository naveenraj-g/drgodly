/**
 * @file appointmentDisplay.ts
 * @description Pure display-mapping helpers shared by the appointment demo
 * page's server fetch (page.tsx) and its client components. Framework-free
 * (no "use client"/React) so it can be imported from both sides.
 * @layer client/telemedicine/doctor/component/appointment-demo
 */

import { differenceInYears } from "date-fns";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

// ── Coarse status ─────────────────────────────────────────────────────────────

/** Simplified visual status bucket the demo groups the 10 raw FHIR codes into. */
export type CoarseStatus = "completed" | "in-progress" | "scheduled" | "cancelled";

/**
 * Maps a raw FHIR Appointment.status to the 4-way bucket the demo UI shows.
 * "checked-in"/"arrived" read as "in progress" (patient present, visit
 * underway); the pre-visit codes (proposed/pending/booked/waitlist) and the
 * terminal-but-not-happened ones (cancelled/noshow/entered-in-error) map to
 * "scheduled" and "cancelled" respectively.
 */
const STATUS_TO_COARSE: Record<string, CoarseStatus> = {
  fulfilled: "completed",
  "checked-in": "in-progress",
  arrived: "in-progress",
  proposed: "scheduled",
  pending: "scheduled",
  booked: "scheduled",
  waitlist: "scheduled",
  cancelled: "cancelled",
  noshow: "cancelled",
  "entered-in-error": "cancelled",
};

/**
 * @param status - Raw FHIR Appointment.status code (nullable).
 * @returns The coarse status bucket; unrecognised/missing codes default to
 * "scheduled" rather than silently dropping the row from every bucket.
 */
export function toCoarseStatus(status: string | null | undefined): CoarseStatus {
  return STATUS_TO_COARSE[status ?? ""] ?? "scheduled";
}

// ── Visit type ────────────────────────────────────────────────────────────────

/**
 * An appointment is telemedicine when it carries a virtual_service entry
 * (the FHIR R5 telehealth channel); absence of one defaults to an in-person
 * visit rather than requiring every appointment to declare a modality.
 */
export function isTelemedicine(appointment: TAppointmentResponse): boolean {
  return (appointment.virtual_service?.length ?? 0) > 0;
}

// ── Reason / note lines ───────────────────────────────────────────────────────

/** Bold headline line, e.g. "Follow-up" / "New Consultation" / "Annual Checkup". */
export function reasonLine(appointment: TAppointmentResponse): string {
  return (
    appointment.appointment_type_display ??
    appointment.appointment_type_text ??
    "Consultation"
  );
}

/** Muted detail line under the reason, e.g. the presenting complaint. */
export function noteLine(appointment: TAppointmentResponse): string {
  return appointment.reason?.[0]?.text ?? appointment.description ?? "—";
}

// ── Avatar styling ────────────────────────────────────────────────────────────

/** Pastel palette the avatar color is deterministically picked from. */
const AVATAR_PALETTE = [
  "#fda4af", // rose-300
  "#fdba74", // orange-300
  "#93c5fd", // blue-300
  "#c4b5fd", // violet-300
  "#86efac", // green-300
  "#f9a8d4", // pink-300
  "#7dd3fc", // sky-300
  "#fcd34d", // amber-300
];

/**
 * @param name - Patient display name.
 * @returns Up to 2 uppercase initials, or "?" when no name is available.
 */
export function initialsFor(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Deterministically picks an avatar background color from a patient id, so
 * the same patient always gets the same color without storing one.
 */
export function avatarColorFor(seed: number | null | undefined): string {
  const index = Math.abs(seed ?? 0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

// ── Patient demographics ─────────────────────────────────────────────────────

/** @returns Age in whole years from Patient.birth_date, or null when unknown. */
export function patientAge(patient: TPatientResponse | null | undefined): number | null {
  if (!patient?.birth_date) return null;
  return differenceInYears(new Date(), new Date(patient.birth_date));
}

/** @returns A single-letter gender label ("M"/"F") or the raw code's initial. */
export function patientGenderLabel(
  patient: TPatientResponse | null | undefined,
): string | null {
  const gender = patient?.gender;
  if (!gender) return null;
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return gender.charAt(0).toUpperCase();
}
