/**
 * Shared utility helpers used across both client and server modules.
 * Keep this file framework-agnostic — no Next.js, no server-only imports.
 */
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import type { TPatientResponse } from "@/modules/entities/schemas/patient";

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
  const daysDiff = differenceInDays(new Date(), parsedDate);
  if (daysDiff < 7) {
    return formatDistanceToNow(parsedDate, { addSuffix: true }).replace("about ", "");
  }
  return format(parsedDate, "MMM dd, yyyy");
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
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
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
