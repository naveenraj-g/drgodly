/**
 * fhirResources.data.ts — content for every FHIR resource page under
 * /docs/mobile-guide/fhir/[resource].
 *
 * Layer: client / docs / data
 *
 * Single source of truth for the FHIR reference: each entry drives one
 * generated page via app/docs/mobile-guide/fhir/[resource]/page.tsx. Mirrors
 * the exact request/response shapes this app's own
 * src/modules/entities/schemas/<resource>/{input,response}.ts and
 * src/modules/server/core/<resource>/infrastructure/services/*.rest.service.ts
 * already validate against — a mobile client hitting FHIR_GQL_URL directly
 * gets the identical contract this web app uses server-side.
 *
 * All endpoints here share one auth model: `Authorization: Bearer <JWT>`,
 * the same token minted via POST {BETTER_AUTH_URL}/api/auth/token (see
 * /docs/mobile-guide/auth) — the one exception is StagingMedicalRecord,
 * which has its own dedicated page (/docs/mobile-guide/fhir-staging)
 * because it breaks this rule (no auth at all today).
 */

import type { ResourceDoc } from "@/modules/client/docs/types";

export const FHIR_RESOURCES: ResourceDoc[] = [
  // ── Patient ──────────────────────────────────────────────────────────────
  {
    slug: "patient",
    title: "Patient",
    basePath: "/patients",
    description:
      "The FHIR Patient record. A Better Auth user completes one Patient profile before they can book " +
      "appointments or use any clinical feature — every other resource's subject/patient_id references this.",
    usage: {
      patient: "Patient booking wizard calls GET /patients/me first to resolve the caller's own patient_id before booking.",
      doctor: "Doctor Clinical Records looks up the patient by id to show name/demographics alongside appointment data.",
    },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a patient record",
        notes: "user_id and org_id are required — they scope the record to the Better Auth account that owns it.",
        requestExample: { user_id: "usr_123", org_id: "org_1", gender: "male", birth_date: "1990-01-01" },
        responseExample: {
          id: 10001, user_id: "usr_123", org_id: "org_1", gender: "male", birth_date: "1990-01-01",
          active: true, name: [], identifier: [], telecom: [], address: [], photo: [], contact: [],
          communication: [], general_practitioner: [], link: [],
          created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
        },
      },
      {
        method: "POST",
        path: "/full",
        summary: "Create a patient with all sub-resources in one atomic call",
        notes: "Same as create, plus arrays for name/telecom/address/communication — avoids 4 separate round-trips during onboarding.",
        requestExample: {
          user_id: "usr_123", org_id: "org_1", gender: "male", birth_date: "1990-01-01",
          name: [{ use: "official", family: "Doe", given: ["John"] }],
          telecom: [{ system: "phone", value: "+1-555-0100", use: "mobile" }],
        },
        responseExample: { id: 10001, name: [{ id: 1, use: "official", family: "Doe", given: ["John"] }], telecom: [{ id: 1, system: "phone", value: "+1-555-0100" }] },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search patients",
        queryParams: [
          { name: "family_name", type: "string", description: "Filter by family name (partial match)" },
          { name: "given_name", type: "string", description: "Filter by given name (partial match)" },
          { name: "gender", type: "string", description: "male | female | other | unknown" },
          { name: "active", type: "boolean", description: "Filter by active status" },
          { name: "user_id", type: "string", description: "Filter to one Better Auth user" },
          { name: "org_id", type: "string", description: "Filter to one organization" },
          { name: "limit", type: "number", description: "Max records (default 10)" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 10001, user_id: "usr_123", gender: "male" }] },
      },
      {
        method: "GET",
        path: "/me",
        summary: "Get the caller's own patient record",
        notes: "Resolved from the bearer token's user id — no id param needed. Returns null if the caller hasn't completed onboarding.",
        responseExample: { id: 10001, user_id: "usr_123", gender: "male", birth_date: "1990-01-01" },
      },
      { method: "GET", path: "/{id}", summary: "Get a patient by id", responseExample: { id: 10001, user_id: "usr_123", gender: "male" } },
      {
        method: "PATCH",
        path: "/{id}",
        summary: "Update scalar fields",
        requestExample: { gender: "male", birth_date: "1990-01-01", active: true },
        responseExample: { id: 10001, gender: "male", birth_date: "1990-01-01", active: true },
      },
      {
        method: "PATCH",
        path: "/{id}/full",
        summary: "Update scalar fields and replace sub-arrays",
        notes: "Arrays sent here fully replace the existing ones (not merged).",
        requestExample: { active: true, name: [{ use: "official", family: "Doe", given: ["John"] }] },
        responseExample: { id: 10001, active: true, name: [{ id: 1, use: "official", family: "Doe", given: ["John"] }] },
      },
      { method: "DELETE", path: "/{id}", summary: "Delete a patient (cascades to sub-resources)", responseExample: { success: true } },
      {
        method: "POST",
        path: "/{id}/names",
        summary: "Add a name (sub-resource pattern)",
        notes:
          "Patient has 9 sub-resource collections following this identical POST (add) / GET (list) / PATCH /{item_id} (update) / " +
          "DELETE /{item_id} (remove) pattern: names, identifiers, telecom, addresses, photos, contacts, communications, " +
          "general-practitioners, links. Only \"names\" is shown here as the representative example — same shape, different fields, for the rest.",
        requestExample: { use: "official", family: "Doe", given: ["John"], prefix: ["Mr."] },
        responseExample: { id: 1, use: "official", family: "Doe", given: ["John"], prefix: ["Mr."] },
      },
    ],
  },

  // ── Practitioner ─────────────────────────────────────────────────────────
  {
    slug: "practitioner",
    title: "Practitioner",
    basePath: "/practitioners",
    description: "The FHIR Practitioner record for a doctor's account — analogous to Patient but for the clinician side.",
    usage: { doctor: "Doctor profile setup calls POST /practitioners/full with names/telecom/addresses/communications in one call." },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a practitioner record",
        notes: "Unlike Patient, user_id/org_id are optional here.",
        requestExample: { user_id: "usr_456", org_id: "org_1", active: true, gender: "female", birth_date: "1985-06-01" },
        responseExample: { id: 30001, user_id: "usr_456", org_id: "org_1", active: true, gender: "female" },
      },
      { method: "POST", path: "/full", summary: "Create with all sub-resources in one call", requestExample: { active: true, name: [{ use: "official", family: "Smith", given: ["Jane"] }] }, responseExample: { id: 30001, name: [{ id: 1, family: "Smith", given: ["Jane"] }] } },
      {
        method: "GET",
        path: "/",
        summary: "List/search practitioners",
        queryParams: [
          { name: "family_name", type: "string", description: "Filter by family name" },
          { name: "given_name", type: "string", description: "Filter by given name" },
          { name: "active", type: "boolean", description: "Filter by active status" },
          { name: "user_id", type: "string", description: "Filter to one Better Auth user" },
          { name: "org_id", type: "string", description: "Filter to one organization" },
          { name: "limit", type: "number", description: "Max records (default 10)" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 30001, active: true }] },
      },
      { method: "GET", path: "/me", summary: "Get the caller's own practitioner record", responseExample: { id: 30001, user_id: "usr_456", active: true } },
      { method: "GET", path: "/{id}", summary: "Get a practitioner by id", responseExample: { id: 30001, active: true } },
      { method: "PATCH", path: "/{id}", summary: "Update scalar fields", requestExample: { active: true, gender: "female" }, responseExample: { id: 30001, active: true, gender: "female" } },
      { method: "PATCH", path: "/{id}/full", summary: "Update scalar fields and replace sub-arrays", requestExample: { name: [{ family: "Smith", given: ["Jane"] }] }, responseExample: { id: 30001, name: [{ id: 1, family: "Smith", given: ["Jane"] }] } },
      { method: "DELETE", path: "/{id}", summary: "Delete a practitioner (cascades to sub-resources)", responseExample: { success: true } },
      {
        method: "POST",
        path: "/{id}/qualifications",
        summary: "Add a qualification (sub-resource pattern)",
        notes:
          "Practitioner has 6 sub-resource collections following this same POST/GET/PATCH/DELETE pattern: names, identifiers, " +
          "telecom, addresses, photos, qualifications, communications (no contacts/general-practitioners/links here, unlike Patient).",
        requestExample: { code_display: "Doctor of Medicine", issuer_display: "State Medical Board" },
        responseExample: { id: 1, code_display: "Doctor of Medicine", issuer_display: "State Medical Board" },
      },
    ],
  },

  // ── PractitionerRole ─────────────────────────────────────────────────────
  {
    slug: "practitioner-role",
    title: "PractitionerRole",
    basePath: "/practitioner-roles",
    description:
      "Links a Practitioner to an Organization/Location/HealthcareService with specialties and availability — " +
      "this is what patients actually search when booking (not Practitioner directly).",
    usage: { patient: "Booking wizard's practitioner-search step calls GET /practitioner-roles/booking to list bookable doctors." },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a practitioner role",
        notes: "All 10 child arrays (identifier, code, specialty, location, healthcare_service, characteristic, communication, contact, availability, endpoint) are inline on create — no separate sub-resource routes.",
        requestExample: {
          practitioner: "Practitioner/30001", organization: "Organization/190001", active: true,
          code: [{ coding_system: "http://snomed.info/sct", coding_code: "394814009", coding_display: "General practice" }],
          location: [{ reference: "Location/230001" }],
        },
        responseExample: { id: 40001, practitioner_type: "Practitioner", practitioner_id: 30001, active: true, code: [{ coding_display: "General practice" }] },
      },
      {
        method: "GET",
        path: "/",
        summary: "List practitioner roles",
        queryParams: [
          { name: "active", type: "boolean", description: "Filter by active status" },
          { name: "practitioner_id", type: "number", description: "Filter to one practitioner" },
          { name: "user_id", type: "string", description: "Filter to one Better Auth user" },
          { name: "org_id", type: "string", description: "Filter to one organization" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 40001, active: true }] },
      },
      {
        method: "GET",
        path: "/booking",
        summary: "Search bookable practitioner roles (patient-facing doctor search)",
        notes: "Response is enriched with practitioner_detail (name/photo/gender/birth_date/telecom/languages/qualifications) and joined location[]/healthcare_service[] objects — this is the endpoint the patient app actually uses to render a doctor-search results list.",
        queryParams: [
          { name: "specialty_code", type: "string", description: "SNOMED specialty code" },
          { name: "day_of_week", type: "string", description: "mon | tue | wed | thu | fri | sat | sun" },
          { name: "active", type: "boolean", description: "Filter by active status" },
          { name: "org_id", type: "string", description: "Filter to one organization" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: {
          total: 1, limit: 10, offset: 0,
          data: [{
            id: 40001, active: true,
            practitioner_detail: { id: 30001, name: [{ family: "Smith", given: ["Jane"] }], gender: "female", qualification: [{ code_display: "MD" }] },
            location: [{ id: 230001, name: "Downtown Clinic", address_line: "123 Main St" }],
            healthcare_service: [{ id: 260001, name: "General Practice" }],
          }],
        },
      },
      { method: "GET", path: "/{id}", summary: "Get a practitioner role by id", responseExample: { id: 40001, active: true } },
      {
        method: "PATCH",
        path: "/{id}",
        summary: "Update scalar fields",
        notes: "Scalar-only: active, period_start, period_end, availability_exceptions. Child arrays are immutable post-create.",
        requestExample: { active: false, availability_exceptions: "On leave until March 1" },
        responseExample: { id: 40001, active: false, availability_exceptions: "On leave until March 1" },
      },
      { method: "DELETE", path: "/{id}", summary: "Delete a practitioner role", responseExample: { success: true } },
    ],
  },

  // ── Organization ─────────────────────────────────────────────────────────
  {
    slug: "organization",
    title: "Organization",
    basePath: "/organizations",
    description: "A clinic/hospital/practice entity — referenced by PractitionerRole, Location, and used as letterhead context on generated documents.",
    usage: { doctor: "Clinical Records reads the caller's own organization for Rx/lab-order letterhead." },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create an organization",
        notes: "name and at least one type entry are required.",
        requestExample: { name: "Apex Medical Center", type: [{ coding_display: "Healthcare Provider" }], active: true },
        responseExample: { id: 190001, name: "Apex Medical Center", active: true, type: [{ coding_display: "Healthcare Provider" }] },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search organizations",
        queryParams: [
          { name: "name", type: "string", description: "Filter by name (partial match)" },
          { name: "active", type: "boolean", description: "Filter by active status" },
          { name: "user_id", type: "string", description: "Filter to one Better Auth user" },
          { name: "org_id", type: "string", description: "Filter to one organization" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 190001, name: "Apex Medical Center" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get an organization by id", responseExample: { id: 190001, name: "Apex Medical Center", partof_type: null, partof_id: null } },
      { method: "PATCH", path: "/{id}", summary: "Update scalar fields (active, name, partof_display)", requestExample: { name: "Apex Medical Center — Downtown" }, responseExample: { id: 190001, name: "Apex Medical Center — Downtown" } },
      { method: "DELETE", path: "/{id}", summary: "Delete an organization", responseExample: { success: true } },
    ],
  },

  // ── Location ──────────────────────────────────────────────────────────────
  {
    slug: "location",
    title: "Location",
    basePath: "/locations",
    description: "A physical site (clinic room, building, wing) — referenced by PractitionerRole and HealthcareService.",
    usage: { patient: "Surfaced as part of PractitionerRole's booking search results (address shown per doctor)." },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a location",
        notes: "user_id and org_id are required here (unlike Organization). Array fields are plural (identifiers/aliases/types/telecoms/endpoints) — a naming quirk vs. other resources. Address is flat scalar fields, not an array.",
        requestExample: { user_id: "usr_1", org_id: "org_1", name: "Downtown Clinic", status: "active", address_line: "123 Main St", address_city: "Springfield" },
        responseExample: { id: 230001, name: "Downtown Clinic", status: "active", address_line: "123 Main St" },
      },
      {
        method: "GET",
        path: "/",
        summary: "List locations",
        notes: "No name or user_id filter on this resource — only org_id and status.",
        queryParams: [
          { name: "org_id", type: "string", description: "Filter to one organization" },
          { name: "status", type: "string", description: "active | suspended | inactive" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 230001, name: "Downtown Clinic" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get a location by id", responseExample: { id: 230001, name: "Downtown Clinic", status: "active" } },
      { method: "PATCH", path: "/{id}", summary: "Update fields (includes address_line, unlike Organization)", requestExample: { status: "inactive" }, responseExample: { id: 230001, status: "inactive" } },
      { method: "DELETE", path: "/{id}", summary: "Delete a location", responseExample: { success: true } },
    ],
  },

  // ── HealthcareService ────────────────────────────────────────────────────
  {
    slug: "healthcare-service",
    title: "HealthcareService",
    basePath: "/healthcare-services",
    description: "A named service line (e.g. \"General Practice\", \"Physiotherapy\") offered at a Location, referenced by PractitionerRole.",
    usage: { patient: "Surfaced as part of PractitionerRole's booking search results." },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a healthcare service",
        requestExample: { name: "General Practice", active: true, appointment_required: true },
        responseExample: { id: 260001, name: "General Practice", active: true },
      },
      {
        method: "GET",
        path: "/",
        summary: "List healthcare services",
        queryParams: [
          { name: "name", type: "string", description: "Filter by name" },
          { name: "active", type: "boolean", description: "Filter by active status" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 260001, name: "General Practice" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get a healthcare service by id", responseExample: { id: 260001, name: "General Practice" } },
      { method: "PATCH", path: "/{id}", summary: "Update fields (active, name, comment, extra_details, appointment_required, availability_exceptions, photo_*)", requestExample: { active: false }, responseExample: { id: 260001, active: false } },
      { method: "DELETE", path: "/{id}", summary: "Delete a healthcare service", responseExample: { success: true } },
    ],
  },

  // ── Schedule ──────────────────────────────────────────────────────────────
  {
    slug: "schedule",
    title: "Schedule",
    basePath: "/schedules",
    description: "A bookable calendar owned by a PractitionerRole/Location/HealthcareService — Slots belong to a Schedule.",
    usage: { doctor: "Admin/doctor-side scheduling setup only — patients never touch Schedule directly, only Slot." },
    endpoints: [
      { method: "POST", path: "/", summary: "Create a schedule", requestExample: { actor: [{ reference: "PractitionerRole/40001" }], planning_horizon_start: "2026-01-01T00:00:00Z", planning_horizon_end: "2026-03-01T00:00:00Z" }, responseExample: { id: 50001, actor: [{ reference_type: "PractitionerRole", reference_id: 40001 }] } },
      {
        method: "GET",
        path: "/",
        summary: "List schedules",
        notes: "No org_id/user_id filter on this resource.",
        queryParams: [
          { name: "active", type: "boolean", description: "Filter by active status" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 50001, active: true }] },
      },
      { method: "GET", path: "/{id}", summary: "Get a schedule by id", responseExample: { id: 50001, active: true } },
      { method: "PATCH", path: "/{id}", summary: "Update fields (active, comment, planning_horizon_start/end)", requestExample: { active: false }, responseExample: { id: 50001, active: false } },
      { method: "DELETE", path: "/{id}", summary: "Delete a schedule", responseExample: { success: true } },
    ],
  },

  // ── Slot ──────────────────────────────────────────────────────────────────
  {
    slug: "slot",
    title: "Slot",
    basePath: "/slots",
    description: "One bookable time window on a Schedule. Appointment.book() consumes a free Slot.",
    usage: { patient: "Booking wizard calls GET /slots?practitioner_role_id=&date=&status=free to show open times." },
    endpoints: [
      { method: "POST", path: "/", summary: "Create a single slot", requestExample: { schedule: "Schedule/50001", status: "free", start: "2026-01-15T09:00:00Z", end: "2026-01-15T09:30:00Z" }, responseExample: { id: 60001, status: "free", start: "2026-01-15T09:00:00Z", end: "2026-01-15T09:30:00Z" } },
      {
        method: "POST",
        path: "/generate",
        summary: "Bulk-generate slots for a date range",
        notes: "Atomic, all-or-nothing. service_category/type/specialty auto-inherit from the Schedule's PractitionerRole if omitted. This is the admin/doctor-side scheduling tool, not part of the patient journey.",
        requestExample: { schedule_id: 50001, generation_start: "2026-02-01T00:00:00Z", generation_end: "2026-02-28T00:00:00Z", slot_duration_minutes: 30 },
        responseExample: { schedule_id: 50001, generated_count: 96, slot_ids: [60001, 60002], generation_start: "2026-02-01T00:00:00Z", generation_end: "2026-02-28T00:00:00Z", slot_duration_minutes: 30 },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search slots",
        queryParams: [
          { name: "status", type: "string", description: "busy | free | busy-unavailable | busy-tentative | entered-in-error" },
          { name: "schedule_id", type: "number", description: "Filter to one schedule" },
          { name: "practitioner_role_id", type: "number", description: "Filter to one practitioner role" },
          { name: "date", type: "string", description: "Filter to one calendar date" },
          { name: "start_from", type: "string", description: "ISO instant lower bound" },
          { name: "start_to", type: "string", description: "ISO instant upper bound" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 60001, status: "free", start: "2026-01-15T09:00:00Z" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get a slot by id", responseExample: { id: 60001, status: "free" } },
      { method: "PATCH", path: "/{id}", summary: "Update a slot", requestExample: { status: "busy" }, responseExample: { id: 60001, status: "busy" } },
      { method: "DELETE", path: "/{id}", summary: "Delete a slot", responseExample: { success: true } },
    ],
  },

  // ── Appointment ───────────────────────────────────────────────────────────
  {
    slug: "appointment",
    title: "Appointment",
    basePath: "/appointments",
    description: "A booked visit, linking a Patient, a Practitioner (via their PractitionerRole), and the Slot it consumed.",
    usage: {
      patient: "Booking wizard's final step calls POST /appointments/book; patient dashboard lists via GET /appointments?user_id=<self>.",
      doctor: "Doctor dashboard calls GET /appointments to show today's schedule.",
    },
    endpoints: [
      {
        method: "POST",
        path: "/book",
        summary: "Book an appointment (the endpoint the app actually uses)",
        notes: "Atomically builds participants and links+busies the slot. Returns 409 if the slot is no longer free — always re-check slot availability on conflict.",
        requestExample: { practitioner_id: 30001, slot_id: 60001, patient_id: 10001, appointment_type_display: "Follow-up", reason_code: "E11.9", comment: "Recurring headaches" },
        responseExample: { id: 70019, status: "booked", start: "2026-01-15T09:00:00Z", end: "2026-01-15T09:30:00Z", participant: [{ reference_type: "Patient", reference_id: 10001, status: "accepted" }, { reference_type: "Practitioner", reference_id: 30001, status: "accepted" }] },
      },
      {
        method: "POST",
        path: "/",
        summary: "Create an appointment (full FHIR shape)",
        notes: "Admin/API use — the app itself always uses /book above. status and at least one participant are required.",
        requestExample: { status: "booked", participant: [{ reference: "Patient/10001", status: "accepted" }] },
        responseExample: { id: 70019, status: "booked", participant: [{ reference_type: "Patient", reference_id: 10001 }] },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search appointments",
        notes: "No separate \"my appointments\" endpoint — filter by user_id to scope to the caller.",
        queryParams: [
          { name: "user_id", type: "string", description: "Scope to one Better Auth user (patient or doctor)" },
          { name: "status", type: "string", description: "proposed | pending | booked | arrived | fulfilled | cancelled | noshow | entered-in-error | checked-in | waitlist" },
          { name: "patient_id", type: "number", description: "Filter to one patient" },
          { name: "practitioner_id", type: "number", description: "Filter to one practitioner" },
          { name: "start_from", type: "string", description: "ISO instant lower bound" },
          { name: "start_to", type: "string", description: "ISO instant upper bound" },
          { name: "org_id", type: "string", description: "Filter to one organization" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 70019, status: "booked", start: "2026-01-15T09:00:00Z" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get an appointment by id", responseExample: { id: 70019, status: "booked" } },
      { method: "PATCH", path: "/{id}", summary: "Update an appointment", requestExample: { status: "cancelled" }, responseExample: { id: 70019, status: "cancelled" } },
      { method: "DELETE", path: "/{id}", summary: "Delete an appointment", responseExample: { success: true } },
      {
        method: "POST",
        path: "/{id}/reschedule",
        summary: "Reschedule to a different slot",
        notes: "Frees the old slot and busies the new one atomically.",
        requestExample: { new_slot_id: 60050 },
        responseExample: { id: 70019, status: "booked", start: "2026-01-16T09:00:00Z" },
      },
    ],
  },

  // ── Encounter ─────────────────────────────────────────────────────────────
  {
    slug: "encounter",
    title: "Encounter",
    basePath: "/encounters",
    description: "The clinical record of an appointment actually taking place — where Conditions/Observations/etc. are attributed.",
    usage: { patient: "Patient's appointment detail page calls GET /encounters?appointment_id= to show the encounter tied to a completed visit." },
    endpoints: [
      { method: "POST", path: "/", summary: "Create an encounter", notes: "status is the only required field.", requestExample: { status: "in-progress", subject: "Patient/10001", appointment: [{ reference: "Appointment/70019" }] }, responseExample: { id: 80019, status: "in-progress", subject_type: "Patient", subject_id: 10001 } },
      {
        method: "GET",
        path: "/",
        summary: "List/search encounters",
        queryParams: [
          { name: "status", type: "string", description: "planned | in-progress | on-hold | discharged | completed | cancelled | discontinued | entered-in-error | unknown" },
          { name: "patient_id", type: "number", description: "Filter to one patient" },
          { name: "appointment_id", type: "number", description: "Filter to one appointment" },
          { name: "actual_period_start_from", type: "string", description: "ISO instant lower bound" },
          { name: "actual_period_start_to", type: "string", description: "ISO instant upper bound" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 80019, status: "completed" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get an encounter by id", responseExample: { id: 80019, status: "completed" } },
      { method: "PATCH", path: "/{id}", summary: "Update scalar fields (status, actual_period_end, priority_*, subject_status_*, planned_end_date)", requestExample: { status: "completed" }, responseExample: { id: 80019, status: "completed" } },
      { method: "DELETE", path: "/{id}", summary: "Delete an encounter", responseExample: { success: true } },
    ],
  },

  // ── Condition ─────────────────────────────────────────────────────────────
  {
    slug: "condition",
    title: "Condition",
    basePath: "/conditions",
    description: "A diagnosis or clinical problem attributed to a Patient/Encounter (ICD-10-CM coded).",
    usage: {
      patient: "Read on the appointment detail page's clinical summary.",
      doctor: "Written on post-consultation review and the Clinical Records workspace.",
    },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a condition",
        notes: "All fields optional; minimum viable is subject + code_code.",
        requestExample: { subject: "Patient/10001", code_system: "http://hl7.org/fhir/sid/icd-10-cm", code_code: "E11.9", code_display: "Type 2 diabetes mellitus", clinical_status_code: "active" },
        responseExample: { id: 90001, subject_type: "Patient", subject_id: 10001, code_display: "Type 2 diabetes mellitus", clinical_status_code: "active", created_at: "2026-01-15T09:30:00Z" },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search conditions",
        queryParams: [
          { name: "clinical_status", type: "string", description: "Filter by clinical status" },
          { name: "patient_id", type: "number", description: "Filter to one patient" },
          { name: "encounter_id", type: "number", description: "Filter to one encounter" },
          { name: "recorded_from", type: "string", description: "ISO date lower bound" },
          { name: "recorded_to", type: "string", description: "ISO date upper bound" },
          { name: "limit", type: "number", description: "Max records (1-200)" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 90001, code_display: "Type 2 diabetes mellitus" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get a condition by id", responseExample: { id: 90001, code_display: "Type 2 diabetes mellitus" } },
      {
        method: "PATCH",
        path: "/{id}",
        summary: "Update scalar fields",
        notes: "subject and child arrays (body_site, stage, evidence, note) are immutable post-create — delete + recreate to change them.",
        requestExample: { clinical_status_code: "resolved" },
        responseExample: { id: 90001, clinical_status_code: "resolved" },
      },
      { method: "DELETE", path: "/{id}", summary: "Delete a condition", responseExample: { success: true } },
    ],
  },

  // ── Observation ───────────────────────────────────────────────────────────
  {
    slug: "observation",
    title: "Observation",
    basePath: "/observations",
    description: "A measurement or finding (vitals, lab result values) — uses a \"value[x]\" mixin where only one value_* field is populated per record.",
    usage: {
      patient: "Read on the appointment detail page and medical records.",
      doctor: "Written on post-consultation review; also read in the staging-record review panel.",
    },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create an observation",
        notes: "status is the only required field. Populate exactly one value_* field for the finding's type (value_quantity_*, value_codeable_concept_*, value_string, value_boolean, etc.) — never more than one.",
        requestExample: { status: "final", code_system: "http://loinc.org", code_code: "8867-4", code_display: "Heart rate", subject: "Patient/10001", value_quantity_value: 72, value_quantity_unit: "beats/min", effective_date_time: "2026-01-15T09:30:00Z" },
        responseExample: { id: 100001, status: "final", code_display: "Heart rate", value_quantity_value: 72, value_quantity_unit: "beats/min" },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search observations",
        queryParams: [
          { name: "status", type: "string", description: "registered | preliminary | final | amended | corrected | cancelled | entered-in-error | unknown" },
          { name: "patient_id", type: "number", description: "Filter to one patient" },
          { name: "encounter_id", type: "number", description: "Filter to one encounter" },
          { name: "effective_from", type: "string", description: "ISO instant lower bound" },
          { name: "effective_to", type: "string", description: "ISO instant upper bound" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 100001, code_display: "Heart rate", value_quantity_value: 72 }] },
      },
      { method: "GET", path: "/{id}", summary: "Get an observation by id", responseExample: { id: 100001, code_display: "Heart rate" } },
      { method: "PATCH", path: "/{id}", summary: "Update fields", requestExample: { status: "amended", value_quantity_value: 75 }, responseExample: { id: 100001, status: "amended", value_quantity_value: 75 } },
      { method: "DELETE", path: "/{id}", summary: "Delete an observation", responseExample: { success: true } },
    ],
  },

  // ── MedicationRequest ─────────────────────────────────────────────────────
  {
    slug: "medication-request",
    title: "MedicationRequest",
    basePath: "/medication-requests",
    description: "A prescription (RxNorm coded), including dosage instructions and dispense/substitution rules.",
    usage: {
      patient: "Read on the Prescriptions card of the appointment/report view.",
      doctor: "Written on post-consultation review and the Clinical Records workspace.",
    },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a prescription",
        notes: "status and intent are required.",
        requestExample: {
          status: "active", intent: "order",
          medication_code_system: "http://www.nlm.nih.gov/research/umls/rxnorm", medication_code_code: "6809", medication_code_display: "Metformin",
          subject: "Patient/10001",
          dosage_instruction: [{ text: "500mg twice daily with meals", route_display: "oral" }],
        },
        responseExample: { id: 110001, status: "active", intent: "order", medication_code_display: "Metformin" },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search prescriptions",
        queryParams: [
          { name: "status", type: "string", description: "active | on-hold | cancelled | completed | entered-in-error | stopped | draft | unknown" },
          { name: "patient_id", type: "number", description: "Filter to one patient" },
          { name: "encounter_id", type: "number", description: "Filter to one encounter" },
          { name: "authored_from", type: "string", description: "ISO date lower bound" },
          { name: "authored_to", type: "string", description: "ISO date upper bound" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 110001, medication_code_display: "Metformin" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get a prescription by id", responseExample: { id: 110001, medication_code_display: "Metformin" } },
      { method: "PATCH", path: "/{id}", summary: "Update fields", requestExample: { status: "completed" }, responseExample: { id: 110001, status: "completed" } },
      { method: "DELETE", path: "/{id}", summary: "Delete a prescription", responseExample: { success: true } },
    ],
  },

  // ── ServiceRequest ────────────────────────────────────────────────────────
  {
    slug: "service-request",
    title: "ServiceRequest",
    basePath: "/service-requests",
    description: "An order (lab test, imaging, referral) — a DiagnosticReport's based_on references the ServiceRequest it fulfils.",
    usage: {
      patient: "Read on the Orders card of the appointment/report view.",
      doctor: "Written on post-consultation review and the Clinical Records workspace.",
    },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create an order",
        notes: "status and intent are required.",
        requestExample: { status: "active", intent: "order", code_system: "http://loinc.org", code_code: "24323-8", code_display: "Comprehensive metabolic panel", subject: "Patient/10001", priority: "routine" },
        responseExample: { id: 120007, status: "active", intent: "order", code_display: "Comprehensive metabolic panel" },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search orders",
        queryParams: [
          { name: "status", type: "string", description: "draft | active | on-hold | revoked | completed | entered-in-error | unknown" },
          { name: "patient_id", type: "number", description: "Filter to one patient" },
          { name: "encounter_id", type: "number", description: "Filter to one encounter" },
          { name: "authored_from", type: "string", description: "ISO date lower bound" },
          { name: "authored_to", type: "string", description: "ISO date upper bound" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 120007, code_display: "Comprehensive metabolic panel" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get an order by id", responseExample: { id: 120007, code_display: "Comprehensive metabolic panel" } },
      { method: "PATCH", path: "/{id}", summary: "Update fields", requestExample: { status: "completed" }, responseExample: { id: 120007, status: "completed" } },
      { method: "DELETE", path: "/{id}", summary: "Delete an order", responseExample: { success: true } },
    ],
  },

  // ── DiagnosticReport ──────────────────────────────────────────────────────
  {
    slug: "diagnostic-report",
    title: "DiagnosticReport",
    basePath: "/diagnostic-reports",
    description: "A finalized lab/imaging report — references the ServiceRequest it fulfils (based_on) and the Observations backing it (result).",
    usage: {
      patient: "Read on the Orders/results card of the appointment/report view.",
      doctor: "Written on post-consultation review; presented_form.url is a FileNest fileId for the original PDF/image.",
    },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a report",
        notes: "status is required. result[] (the Observations this report is built from) is deliberately NOT accepted here — create the Observations first, then PATCH the report with result[] (see below).",
        requestExample: { status: "final", code_code: "24323-8", subject: "Patient/10001", based_on: [{ reference: "ServiceRequest/120007", reference_display: "Comprehensive metabolic panel" }], conclusion: "Within normal limits.", presented_form: [{ url: "<filenest-file-id>", content_type: "application/pdf", title: "Lab Report.pdf" }] },
        responseExample: { id: 130001, status: "final", conclusion: "Within normal limits.", result: [] },
      },
      {
        method: "GET",
        path: "/",
        summary: "List/search reports",
        queryParams: [
          { name: "status", type: "string", description: "Filter by status" },
          { name: "patient_id", type: "number", description: "Filter to one patient" },
          { name: "issued_from", type: "string", description: "ISO date lower bound" },
          { name: "issued_to", type: "string", description: "ISO date upper bound" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 130001, conclusion: "Within normal limits." }] },
      },
      { method: "GET", path: "/{id}", summary: "Get a report by id", responseExample: { id: 130001, conclusion: "Within normal limits.", presented_form: [{ url: "<filenest-file-id>" }] } },
      {
        method: "PATCH",
        path: "/{id}",
        summary: "Update fields, including attaching result Observations",
        notes: "result[] is full-replace, not merge — read the report first if you need to append to an existing result list rather than overwrite it.",
        requestExample: { status: "final", result: [{ reference: "Observation/100001", reference_display: "Fasting glucose" }, { reference: "Observation/100002", reference_display: "HbA1c" }] },
        responseExample: { id: 130001, status: "final", result: [{ reference_type: "Observation", reference_id: 100001 }, { reference_type: "Observation", reference_id: 100002 }] },
      },
      { method: "DELETE", path: "/{id}", summary: "Delete a report", responseExample: { success: true } },
    ],
  },

  // ── DocumentReference ─────────────────────────────────────────────────────
  {
    slug: "document-reference",
    title: "DocumentReference",
    basePath: "/document-references",
    description: "A filed clinical document (discharge summary, referral letter) — general-purpose attachment metadata, distinct from the AI-extraction staging layer.",
    usage: { doctor: "Referenced from Clinical Records when a document has been filed to the patient's record." },
    endpoints: [
      {
        method: "POST",
        path: "/",
        summary: "Create a document reference",
        notes: "status and at least one content[] entry are required. content[].attachment.url is a FileNest fileId.",
        requestExample: { status: "current", type_code: "34133-9", type_display: "Summary of episode note", subject: "Patient/10001", content: [{ attachment: { url: "<filenest-file-id>", content_type: "application/pdf", title: "Discharge Summary.pdf" } }] },
        responseExample: { id: 140001, status: "current", content: [{ attachment: { url: "<filenest-file-id>", title: "Discharge Summary.pdf" } }] },
      },
      {
        method: "GET",
        path: "/",
        summary: "List document references",
        notes: "No status/patient_id filter today — only pagination.",
        queryParams: [
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 140001, status: "current" }] },
      },
      { method: "GET", path: "/{id}", summary: "Get a document reference by id", responseExample: { id: 140001, status: "current" } },
      { method: "PATCH", path: "/{id}", summary: "Update fields, including replacing content[]", notes: "Unlike DiagnosticReport, content[] can be fully replaced via PATCH.", requestExample: { description: "Updated discharge summary" }, responseExample: { id: 140001, description: "Updated discharge summary" } },
      { method: "DELETE", path: "/{id}", summary: "Delete a document reference", responseExample: { success: true } },
    ],
  },

  // ── Terminology ───────────────────────────────────────────────────────────
  {
    slug: "terminology",
    title: "Terminology",
    basePath: "/terminology",
    description: "Read-only reference data (SNOMED CT, LOINC, ICD-10-CM, RxNorm) for populating code/coded-value pickers. No create/update/delete.",
    usage: { doctor: "Backs every code picker in Clinical Records (diagnosis, lab, medication search)." },
    endpoints: [
      {
        method: "GET",
        path: "/search",
        summary: "Full-text search across all coding systems",
        queryParams: [
          { name: "q", type: "string", required: true, description: "Search text (min 1 char)" },
          { name: "system", type: "string", description: "Restrict to one coding system URL" },
          { name: "limit", type: "number", description: "Max records (1-200)" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { total: 1, limit: 10, offset: 0, data: [{ id: 1, code: "E11.9", display: "Type 2 diabetes mellitus", system: "http://hl7.org/fhir/sid/icd-10-cm", system_name: "ICD-10-CM", active: true }] },
      },
      {
        method: "GET",
        path: "/concepts",
        summary: "Concepts valid for a specific resource field (for dropdowns)",
        queryParams: [
          { name: "resource", type: "string", required: true, description: "e.g. \"Condition\"" },
          { name: "field", type: "string", required: true, description: "e.g. \"clinicalStatus\"" },
          { name: "q", type: "string", description: "Filter within this field's value set" },
          { name: "limit", type: "number", description: "Max records" },
          { name: "offset", type: "number", description: "Pagination offset" },
        ],
        responseExample: { resource: "Condition", field: "clinicalStatus", value_set: "condition-clinical", binding_strength: "required", multiple_allowed: false, total: 4, limit: 10, offset: 0, concepts: [{ code: "active", display: "Active" }] },
      },
      { method: "POST", path: "/lookup", summary: "Look up one code", requestExample: { system: "http://hl7.org/fhir/sid/icd-10-cm", code: "E11.9" }, responseExample: { found: true, concept: { code: "E11.9", display: "Type 2 diabetes mellitus" }, code_system: "ICD-10-CM" } },
      { method: "POST", path: "/lookup-batch", summary: "Look up up to 100 codes at once", requestExample: { items: [{ system: "http://loinc.org", code: "8867-4" }, { system: "http://loinc.org", code: "24323-8" }] }, responseExample: { results: [{ found: true, concept: { display: "Heart rate" } }, { found: true, concept: { display: "Comprehensive metabolic panel" } }] } },
      { method: "POST", path: "/validate", summary: "Validate a code against a resource field's value set", requestExample: { resource: "Condition", field: "clinicalStatus", system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }, responseExample: { valid: true, in_value_set: true, binding_strength: "required", message: "Code is valid for this field." } },
    ],
  },
];
