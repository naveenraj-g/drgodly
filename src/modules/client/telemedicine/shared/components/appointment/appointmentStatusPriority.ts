/**
 * appointmentStatusPriority.ts
 *
 * Layer: client / telemedicine / shared / components / appointment
 *
 * Shared status-priority ranking for appointment list tables (patient and
 * doctor portals both use this). The FHIR server already returns rows
 * ordered by date/time, which is a fine primary order — but a cancelled
 * appointment from earlier today outranking a booked one from tomorrow reads
 * as broken to a user scanning the list. This adds a secondary sort so
 * active/confirmed appointments surface first, tentative ones sit in the
 * middle, and cancelled/terminal ones sink to the bottom, while preserving
 * the existing date/time order within each group.
 */

import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";

/**
 * Rank per FHIR R4 Appointment status code — lower sorts first.
 *   0 — active/confirmed: the appointment is actually going to happen
 *   1 — tentative: still needs action, but not dead
 *   2 — terminal/negative: cancelled, no-show, or errored out
 * Unrecognised or missing status codes fall back to the tentative tier
 * rather than either extreme, since they're neither confirmed nor cancelled.
 */
const STATUS_RANK: Record<string, number> = {
  booked: 0,
  arrived: 0,
  "checked-in": 0,
  fulfilled: 0,
  proposed: 1,
  pending: 1,
  waitlist: 1,
  cancelled: 2,
  noshow: 2,
  "entered-in-error": 2,
};

/** @private Fallback rank for a status code not present in STATUS_RANK. */
const DEFAULT_RANK = 1;

/**
 * Sorts appointments by status priority (active > tentative > cancelled).
 * Uses Array.prototype.sort's stability to preserve the incoming date/time
 * order within each priority group — this only reorders across groups.
 *
 * @param rows - Appointments as returned by the paginated list endpoint.
 * @returns A new, re-ordered array — the input array is not mutated.
 */
export function sortAppointmentsByStatusPriority(
  rows: TAppointmentResponse[],
): TAppointmentResponse[] {
  return [...rows].sort(
    (a, b) =>
      (STATUS_RANK[a.status ?? ""] ?? DEFAULT_RANK) -
      (STATUS_RANK[b.status ?? ""] ?? DEFAULT_RANK),
  );
}
