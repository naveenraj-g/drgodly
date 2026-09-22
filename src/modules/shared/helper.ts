/**
 * Shared utility helpers used across both client and server modules.
 * Keep this file framework-agnostic — no Next.js, no server-only imports.
 */
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

/**
 * The single timezone every date/time computation and display in this
 * application is pinned to — India Standard Time. Deliberately hardcoded
 * rather than derived from the server's or browser's own runtime timezone:
 * servers commonly run in UTC (so a plain `new Date()` "today" on the
 * server can be up to 5.5 hours off from India's calendar day), and every
 * user of this application is in India regardless of an individual
 * machine's clock settings.
 */
export const APP_TIMEZONE = "Asia/Kolkata";

/**
 * Returns "now" as a Date object whose local getters (getDate, getMonth,
 * getHours, ...) read as the current wall-clock time in IST, regardless of
 * the runtime's own timezone. Use this instead of `new Date()` anywhere
 * "today"/"now" needs to mean "today in India" — calendar enabled/disabled
 * matchers, "is this slot in the past" checks, age calculations, and the
 * like.
 *
 * IMPORTANT: this Date's *epoch* (`.getTime()`/`.valueOf()`) is an artificial
 * value, not a real UTC instant — only its local getters/setters are
 * meaningful. Never pass it to `.toISOString()`, `formatInTimeZone()`,
 * `toZonedTime()`, `fromZonedTime()`, or any of this file's `formatDisplay*`/
 * `formatApiDate`/`startOfDayIST`/`endOfDayIST` helpers (they all re-apply
 * the IST shift and would double-convert). Only compare/format it with
 * functions that read local getters — date-fns's own `format`, `getDate`,
 * `differenceInDays`, `setHours`, `toDateString`, etc. — or against another
 * `toZonedTime(..., APP_TIMEZONE)` result. For anything that needs a real
 * instant (an API boundary, a display string), start from `new Date()`
 * instead and let that helper do the IST conversion itself.
 */
export function nowIST(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/**
 * Formats a date as "dd-MM-yyyy" — this application's one display date
 * format — always in IST regardless of where the value was computed.
 *
 * @param date - A Date, ISO string, or Unix millisecond timestamp.
 */
export function formatDisplayDate(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), APP_TIMEZONE, "dd-MM-yyyy");
}

/** Formats a date + time as "dd-MM-yyyy HH:mm", pinned to IST. */
export function formatDisplayDateTime(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), APP_TIMEZONE, "dd-MM-yyyy HH:mm");
}

/**
 * Formats a date as "Monday, 14-06-2026" — weekday plus this application's
 * dd-MM-yyyy display format, pinned to IST. For day-heading UI (a timeline
 * section header, a dashboard's "today" label) that wants the weekday name
 * alongside the numeric date.
 */
export function formatDisplayDateLong(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), APP_TIMEZONE, "EEEE, dd-MM-yyyy");
}

/**
 * Formats a date as "dd-MM" (no year), pinned to IST — for compact UI
 * elements (a date-scroller pill, a small calendar chip) where a full
 * "dd-MM-yyyy" wouldn't fit, but the day-before-month ordering should stay
 * consistent with the rest of the application.
 */
export function formatDisplayDayMonth(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), APP_TIMEZONE, "dd-MM");
}

/**
 * Formats a date as "yyyy-MM-dd" — the machine-readable form used for
 * `<input type="date">` values and backend query params, never shown to a
 * user directly — pinned to IST so "today" always means the same calendar
 * day a user in India would expect, regardless of server/browser timezone.
 */
export function formatApiDate(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), APP_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Formats a time as "h:mm a" (e.g. "2:30 PM"), pinned to IST. Use this
 * instead of `toLocaleTimeString()` for appointment/slot times — the
 * browser's own timezone shouldn't decide what time a slot displays as.
 */
export function formatDisplayTime(date: Date | string | number): string {
  return formatInTimeZone(new Date(date), APP_TIMEZONE, "h:mm a");
}

/**
 * Returns the real UTC instant corresponding to 00:00:00.000 of `date`'s
 * calendar day *in IST*, for use as an API date-range boundary
 * (`start_from`/`start_to`-style filters).
 *
 * Deliberately NOT `startOfDay()` from date-fns, which computes midnight in
 * the runtime's own timezone — correct for a browser already set to IST, but
 * silently wrong (off by up to 5.5 hours) on a UTC server or a misconfigured
 * client clock, which would shift which appointments a "today"/date-range
 * filter matches.
 *
 * @param date - A Date, ISO string, or Unix millisecond timestamp.
 */
export function startOfDayIST(date: Date | string | number): Date {
  const isoDay = formatInTimeZone(new Date(date), APP_TIMEZONE, "yyyy-MM-dd");
  return fromZonedTime(`${isoDay}T00:00:00.000`, APP_TIMEZONE);
}

/**
 * Returns the real UTC instant corresponding to 23:59:59.999 of `date`'s
 * calendar day *in IST*. See {@link startOfDayIST} for why this isn't
 * date-fns's `endOfDay()`.
 *
 * @param date - A Date, ISO string, or Unix millisecond timestamp.
 */
export function endOfDayIST(date: Date | string | number): Date {
  const isoDay = formatInTimeZone(new Date(date), APP_TIMEZONE, "yyyy-MM-dd");
  return fromZonedTime(`${isoDay}T23:59:59.999`, APP_TIMEZONE);
}

/**
 * Returns the real UTC instant corresponding to 00:00:00.000 of the 1st of
 * `date`'s calendar month *in IST*. See {@link startOfDayIST} for why this
 * isn't date-fns's `startOfMonth()`.
 */
export function startOfMonthIST(date: Date | string | number): Date {
  const isoMonth = formatInTimeZone(new Date(date), APP_TIMEZONE, "yyyy-MM");
  return fromZonedTime(`${isoMonth}-01T00:00:00.000`, APP_TIMEZONE);
}

/**
 * Returns the real UTC instant corresponding to 23:59:59.999 of the last day
 * of `date`'s calendar month *in IST*. See {@link startOfDayIST} for why this
 * isn't date-fns's `endOfMonth()`.
 */
export function endOfMonthIST(date: Date | string | number): Date {
  const zoned = toZonedTime(new Date(date), APP_TIMEZONE);
  const lastDay = new Date(zoned.getFullYear(), zoned.getMonth() + 1, 0).getDate();
  const isoMonth = formatInTimeZone(new Date(date), APP_TIMEZONE, "yyyy-MM");
  return fromZonedTime(`${isoMonth}-${String(lastDay).padStart(2, "0")}T23:59:59.999`, APP_TIMEZONE);
}

/**
 * Calculates the elapsed time between two Unix millisecond timestamps.
 *
 * @param startMs - Start time in milliseconds (Date.now() snapshot).
 * @param endMs   - End time in milliseconds (Date.now() snapshot).
 * @returns An object with the raw `durationMs` and a human-readable
 *          `duration` string formatted as "HH:mm:ss.SSS".
 */
export function formatDuration(
  startMs: number,
  endMs: number
): { durationMs: number; duration: string } {
  const durationMs = endMs - startMs;
  const h = Math.floor(durationMs / 3_600_000);
  const m = Math.floor((durationMs % 3_600_000) / 60_000);
  const s = Math.floor((durationMs % 60_000) / 1_000);
  const ms = durationMs % 1_000;
  const duration =
    [h, m, s].map((n) => String(n).padStart(2, "0")).join(":") +
    "." +
    String(ms).padStart(3, "0");
  return { durationMs, duration };
}

/** Capitalises every word in a space-separated string. */
export function capitalizeString(word: string) {
  return word
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatSmartDate(date: Date | string | number): string {
  const parsedDate = new Date(date);
  const daysDiff = differenceInDays(nowIST(), toZonedTime(parsedDate, APP_TIMEZONE));
  if (daysDiff < 7) {
    return formatDistanceToNow(parsedDate, { addSuffix: true }).replace("about ", "");
  }
  return formatDisplayDate(parsedDate);
}

export function getProfileInitials(name?: string): string {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0][0].toUpperCase();
  return words[0][0].toUpperCase() + words[1][0].toUpperCase();
}

/**
 * Derives a display name string from a Patient FHIR record.
 * Uses `name[0].text` when available, otherwise builds from prefix + given + family.
 *
 * @param patient - Full Patient FHIR response.
 * @returns Formatted display name, or empty string if no name data.
 */
export function formatPatientName(patient: TPatientResponse): string {
  const n = patient.name?.[0];
  if (!n) return "";
  if (n.text) return n.text;
  const parts = [...(n.prefix ?? []), ...(n.given ?? []), n.family].filter(Boolean);
  return parts.join(" ");
}

/**
 * Calculates a patient's age in whole years from their FHIR birth_date.
 *
 * @param birthDate - ISO 8601 date string (e.g. "1990-05-14"), or nullish.
 * @returns Age in whole years, or null if birthDate is missing/invalid.
 */
export function getPatientAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const dob = toZonedTime(new Date(birthDate), APP_TIMEZONE);
  if (Number.isNaN(dob.getTime())) return null;
  const now = nowIST();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Extracts the preferred email and phone number from a Patient's telecom array.
 * When more than one entry shares a system, the lowest `rank` wins (FHIR
 * convention: rank 1 = most-preferred contact point).
 *
 * @param telecom - Patient.telecom array from the FHIR response, or nullish.
 * @returns Object with `email` and `phone`, each null if not present.
 */
export function getPatientContact(
  telecom: TPatientResponse["telecom"],
): { email: string | null; phone: string | null } {
  const pick = (system: string) => {
    const matches = (telecom ?? []).filter((t) => t?.system === system && t?.value);
    if (matches.length === 0) return null;
    matches.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    return matches[0].value ?? null;
  };
  return { email: pick("email"), phone: pick("phone") };
}

/**
 * Builds a one-line context prefix carrying the patient's known name, age,
 * and contact details. Meant to be prepended (server-side, once) to the
 * first message of a new AI intake/consultation chat session — the backing
 * agents have no access to the app's Patient records, so without this they
 * re-ask for demographic details the app already has on file every time a
 * new conversation starts.
 *
 * @param patient - Full Patient FHIR response (birth_date + telecom are read).
 * @param displayName - Patient's display name (Better Auth account name).
 * @returns A "[Patient context: ...]" string, or "" if no data is available.
 */
export function buildPatientContextPrefix(
  patient: TPatientResponse | null | undefined,
  displayName: string,
): string {
  const parts: string[] = [];
  if (displayName) parts.push(`name=${displayName}`);
  const age = getPatientAge(patient?.birth_date);
  if (age != null) parts.push(`age=${age}`);
  const { email, phone } = getPatientContact(patient?.telecom);
  if (email) parts.push(`email=${email}`);
  if (phone) parts.push(`phone=${phone}`);
  return parts.length ? `[Patient context: ${parts.join(", ")}]` : "";
}
