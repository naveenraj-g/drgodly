/**
 * Doctor appointment query key factory.
 *
 * Layer: client / telemedicine / doctor / appointments / list
 *
 * Centralises the root TanStack Query key for the doctor's appointment data
 * so mutations (Confirm/Cancel/Reschedule) can invalidate every dependent
 * query — including AppointmentDemo's own tab/count/summary queries in
 * demoQueries.ts, which nest under this same root deliberately (see
 * appointmentDemoKeys.all there) so one invalidation covers both.
 */

/** Root query key — invalidate this after any appointment mutation. */
export const doctorAppointmentKeys = {
  all: ["doctor-appointments"] as const,
};
