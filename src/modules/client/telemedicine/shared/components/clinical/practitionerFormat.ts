/**
 * practitionerFormat — practitioner display-name formatting shared by the
 * doctor portal's dashboard screens.
 *
 * Layer: client / telemedicine / shared / components / clinical
 *
 * Formatting only, no data access, so this is safe to import anywhere — see
 * clinicalFormat.ts, its sibling in this file.
 */

import type { TPractitionerNameResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Derives a practitioner's display name from their FHIR Practitioner.name
 * entries. Builds "<prefix> <given> <family>" from the first entry's
 * structured fields so a title is always shown — that entry's own prefix
 * (e.g. "Dr.", "Prof."), or "Dr." when it has none. Falls back to the
 * free-text field only when given/family are both empty, since there's
 * nothing else to build from.
 *
 * @param name - TPractitionerResponse.name array, or null/undefined.
 * @returns Display name string, or "Doctor" as fallback.
 */
export function getPractitionerDisplayName(
  name?: TPractitionerNameResponse[] | null,
): string {
  if (!name || name.length === 0) return "Doctor";
  const first = name[0];
  const parts = [...(first.given ?? []), first.family ?? ""].filter(Boolean);
  if (parts.length === 0) return first.text || "Doctor";
  const prefix = first.prefix?.[0] || "Dr.";
  return `${prefix} ${parts.join(" ")}`;
}
