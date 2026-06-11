/**
 * Shared enum option arrays for the Create Organization form.
 * Centralised here so all tab components import from one place.
 */

export const TELECOM_SYSTEMS = [
  "phone", "fax", "email", "pager", "url", "sms", "other",
] as const;

export const TELECOM_USES = ["home", "work", "temp", "old", "mobile"] as const;

export const ADDRESS_USES = ["home", "work", "temp", "old", "billing"] as const;

export const ADDRESS_TYPES = ["postal", "physical", "both"] as const;

export const IDENTIFIER_USES = [
  "usual", "official", "temp", "secondary", "old",
] as const;

export const NAME_USES = [
  "usual", "official", "temp", "nickname", "anonymous", "old", "maiden",
] as const;
