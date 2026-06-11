/**
 * Zod schemas and inferred TypeScript types for the Organization resource.
 *
 * Layer: entities / schemas
 * Resource: Organization (FHIR R4)
 * Source: mirrors fhir-gql OrgResponse / PaginatedOrgResponse / all input schemas
 *
 * Schema groups:
 *  1. Sub-resource response schemas  (nullish — API returns explicit JSON null)
 *  2. Top-level OrgResponse + PaginatedOrgResponse
 *  3. Input sub-schemas               (OrgTypeInput, OrgTelecomInput, etc.)
 *  4. Input validation schemas        (RegisterOrg, PatchOrg, ListOrgs, GetById, Delete)
 *  5. Action schemas                  (ZSA transport-layer input wrappers)
 *  6. Form schemas                    (client UI layer — may differ from validation schemas
 *                                      where string arrays are represented as comma-separated
 *                                      strings and transformed in the modal's handleSubmit)
 */

import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";

// ── Sub-resource response schemas ─────────────────────────────────────────────
// All optional fields use .nullish() — the fhir-gql API serialises Python's
// Optional[X] = None as explicit JSON null, not as a missing key.
// .nullish() = z.string().optional().nullable() — accepts string | null | undefined.

/** Single FHIR Identifier attached to an Organization. */
export const OrgIdentifierResponseSchema = z.object({
  id: z.number(),
  use: z.string().nullish(),
  type_system: z.string().nullish(),
  type_code: z.string().nullish(),
  type_display: z.string().nullish(),
  type_text: z.string().nullish(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
  assigner: z.string().nullish(),
});
export type TOrgIdentifierResponse = z.infer<typeof OrgIdentifierResponseSchema>;

/**
 * FHIR Organization.type coding — classifies the organization
 * (e.g. prov = Healthcare Provider, dept = Hospital Department).
 */
export const OrgTypeResponseSchema = z.object({
  id: z.number(),
  coding_system: z.string().nullish(),
  coding_code: z.string().nullish(),
  coding_display: z.string().nullish(),
  text: z.string().nullish(),
});
export type TOrgTypeResponse = z.infer<typeof OrgTypeResponseSchema>;

/** Alternative name the organization is or was known by. */
export const OrgAliasResponseSchema = z.object({
  id: z.number(),
  value: z.string().nullish(),
});
export type TOrgAliasResponse = z.infer<typeof OrgAliasResponseSchema>;

/** Single contact point (phone, email, fax, etc.) for the organization. */
export const OrgTelecomResponseSchema = z.object({
  id: z.number(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TOrgTelecomResponse = z.infer<typeof OrgTelecomResponseSchema>;

/** Postal or physical address for the organization. */
export const OrgAddressResponseSchema = z.object({
  id: z.number(),
  use: z.string().nullish(),
  type: z.string().nullish(),
  text: z.string().nullish(),
  line: z.array(z.string()).nullish(),
  city: z.string().nullish(),
  district: z.string().nullish(),
  state: z.string().nullish(),
  postal_code: z.string().nullish(),
  country: z.string().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TOrgAddressResponse = z.infer<typeof OrgAddressResponseSchema>;

/** Telecom nested inside an org contact person (separate from the org-level telecom). */
export const OrgContactTelecomResponseSchema = z.object({
  id: z.number(),
  system: z.string().nullish(),
  value: z.string().nullish(),
  use: z.string().nullish(),
  rank: z.number().nullish(),
  period_start: z.string().nullish(),
  period_end: z.string().nullish(),
});
export type TOrgContactTelecomResponse = z.infer<typeof OrgContactTelecomResponseSchema>;

/** Contact person for the organization (admin, billing, clinical, etc.). */
export const OrgContactResponseSchema = z.object({
  id: z.number(),
  purpose_system: z.string().nullish(),
  purpose_code: z.string().nullish(),
  purpose_display: z.string().nullish(),
  purpose_text: z.string().nullish(),
  name_use: z.string().nullish(),
  name_text: z.string().nullish(),
  name_family: z.string().nullish(),
  name_given: z.array(z.string()).nullish(),
  name_prefix: z.array(z.string()).nullish(),
  name_suffix: z.array(z.string()).nullish(),
  name_period_start: z.string().nullish(),
  name_period_end: z.string().nullish(),
  address_use: z.string().nullish(),
  address_type: z.string().nullish(),
  address_text: z.string().nullish(),
  address_line: z.array(z.string()).nullish(),
  address_city: z.string().nullish(),
  address_district: z.string().nullish(),
  address_state: z.string().nullish(),
  address_postal_code: z.string().nullish(),
  address_country: z.string().nullish(),
  address_period_start: z.string().nullish(),
  address_period_end: z.string().nullish(),
  telecoms: z.array(OrgContactTelecomResponseSchema).nullish(),
});
export type TOrgContactResponse = z.infer<typeof OrgContactResponseSchema>;

/** Technical endpoint reference attached to the organization. */
export const OrgEndpointResponseSchema = z.object({
  id: z.number(),
  reference_type: z.string().nullish(),
  reference_id: z.number().nullish(),
  reference_display: z.string().nullish(),
});
export type TOrgEndpointResponse = z.infer<typeof OrgEndpointResponseSchema>;

// ── Top-level response schemas ─────────────────────────────────────────────────

/** Full FHIR Organization resource returned by the fhir-gql API. */
export const OrgResponseSchema = z.object({
  id: z.number(),
  active: z.boolean().nullish(),
  name: z.string().nullish(),
  // partOf — reference to a parent organization in the hierarchy
  partof_type: z.string().nullish(),
  partof_id: z.number().nullish(),
  partof_display: z.string().nullish(),
  // Sub-resource arrays
  identifier: z.array(OrgIdentifierResponseSchema).nullish(),
  type: z.array(OrgTypeResponseSchema).nullish(),
  alias: z.array(OrgAliasResponseSchema).nullish(),
  telecom: z.array(OrgTelecomResponseSchema).nullish(),
  address: z.array(OrgAddressResponseSchema).nullish(),
  contact: z.array(OrgContactResponseSchema).nullish(),
  endpoint: z.array(OrgEndpointResponseSchema).nullish(),
  // Audit fields injected by the fhir-gql server
  user_id: z.string().nullish(),
  org_id: z.string().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
});
export type TOrgResponse = z.infer<typeof OrgResponseSchema>;

/**
 * Paginated list response — { total, limit, offset, data: TOrgResponse[] }.
 * `total` is the full count before pagination so clients can calculate page count.
 */
export const PaginatedOrgResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(OrgResponseSchema),
});
export type TPaginatedOrgResponse = z.infer<typeof PaginatedOrgResponseSchema>;

// ── Input sub-schemas ──────────────────────────────────────────────────────────
// Mirror fhir-gql's input Pydantic models exactly.
// Used in RegisterOrgValidationSchema and CreateOrgFormSchema.

/** FHIR coding used for Organization.type entries. */
export const OrgTypeInputSchema = z.object({
  coding_system: z.string().optional(),
  coding_code: z.string().optional(),
  coding_display: z.string().optional(),
  text: z.string().optional(),
});
export type TOrgTypeInput = z.infer<typeof OrgTypeInputSchema>;

/** Single FHIR Identifier to attach to an Organization on create. */
export const OrgIdentifierInputSchema = z.object({
  /** Identifier use: usual | official | temp | secondary | old */
  use: z.enum(["usual", "official", "temp", "secondary", "old"]).optional(),
  type_system: z.string().optional(),
  type_code: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  /** URI namespace of the identifier value (e.g. http://hl7.org/fhir/sid/us-npi). */
  system: z.string().optional(),
  value: z.string().min(1, "Identifier value is required"),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  /** Display name of the organization that issued this identifier. */
  assigner: z.string().optional(),
});
export type TOrgIdentifierInput = z.infer<typeof OrgIdentifierInputSchema>;

/** Contact point (phone, email, etc.) for the organization. */
export const OrgTelecomInputSchema = z.object({
  system: z.enum(["phone", "fax", "email", "pager", "url", "sms", "other"]),
  value: z.string().min(1),
  use: z.enum(["home", "work", "temp", "old", "mobile"]).optional(),
  rank: z.number().int().min(1).optional(),
});
export type TOrgTelecomInput = z.infer<typeof OrgTelecomInputSchema>;

/** Postal or physical address for the organization. */
export const OrgAddressInputSchema = z.object({
  use: z.enum(["home", "work", "temp", "old", "billing"]).optional(),
  type: z.enum(["postal", "physical", "both"]).optional(),
  text: z.string().optional(),
  /** Street address lines, e.g. ["123 Main St", "Suite 400"]. */
  line: z.array(z.string()).optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});
export type TOrgAddressInput = z.infer<typeof OrgAddressInputSchema>;

/** Telecom entry nested inside a contact person (not the org-level telecom). */
export const OrgContactTelecomInputSchema = z.object({
  system: z.enum(["phone", "fax", "email", "pager", "url", "sms", "other"]),
  value: z.string().min(1),
  use: z.enum(["home", "work", "temp", "old", "mobile"]).optional(),
  rank: z.number().int().min(1).optional(),
});
export type TOrgContactTelecomInput = z.infer<typeof OrgContactTelecomInputSchema>;

/**
 * Contact person for the organization (admin, billing, clinical, etc.).
 * Mirrors fhir-gql's OrgContactInput with flattened HumanName and Address fields.
 */
export const OrgContactInputSchema = z.object({
  // Purpose CodeableConcept — which function does this contact serve?
  purpose_system: z.string().optional(),
  purpose_code: z.string().optional(),
  purpose_display: z.string().optional(),
  purpose_text: z.string().optional(),
  // HumanName — the contact person's name
  /** HumanName use: usual | official | temp | nickname | anonymous | old | maiden */
  name_use: z.enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]).optional(),
  name_text: z.string().optional(),
  name_family: z.string().optional(),
  name_given: z.array(z.string()).optional(),
  name_prefix: z.array(z.string()).optional(),
  name_suffix: z.array(z.string()).optional(),
  // Address — contact person's address (may differ from the org's address)
  address_use: z.enum(["home", "work", "temp", "old", "billing"]).optional(),
  address_type: z.enum(["postal", "physical", "both"]).optional(),
  address_text: z.string().optional(),
  address_line: z.array(z.string()).optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  // Nested telecom entries for this contact person
  telecom: z.array(OrgContactTelecomInputSchema).optional(),
});
export type TOrgContactInput = z.infer<typeof OrgContactInputSchema>;

/** Technical endpoint reference to attach to the organization. */
export const OrgEndpointInputSchema = z.object({
  /** FHIR reference string, e.g. "Endpoint/1". */
  reference: z.string().min(1, "Reference is required"),
  reference_display: z.string().optional(),
});
export type TOrgEndpointInput = z.infer<typeof OrgEndpointInputSchema>;

// ── Input validation schemas ───────────────────────────────────────────────────

/**
 * Full schema for creating an Organization.
 * Mirrors fhir-gql's RegisterOrgSchema — name and type are required;
 * all sub-resource arrays are optional.
 */
export const RegisterOrgValidationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.array(OrgTypeInputSchema).min(1, "At least one organization type is required"),
  active: z.boolean().optional().default(true),
  /** FHIR reference to parent org, e.g. "Organization/190001". */
  partof: z.string().optional(),
  partof_display: z.string().optional(),
  identifier: z.array(OrgIdentifierInputSchema).optional(),
  alias: z.array(z.object({ value: z.string().min(1) })).optional(),
  telecom: z.array(OrgTelecomInputSchema).optional(),
  address: z.array(OrgAddressInputSchema).optional(),
  contact: z.array(OrgContactInputSchema).optional(),
  endpoint: z.array(OrgEndpointInputSchema).optional(),
  /** Better Auth user ID of the creator — scopes the resource to a user. */
  user_id: z.string().optional(),
  /** Better Auth active organization ID — scopes the resource to a tenant. */
  org_id: z.string().optional(),
});
export type TRegisterOrg = z.infer<typeof RegisterOrgValidationSchema>;

/**
 * Base patch fields (no id, no refinement) — used for the service dto and
 * as the foundation for the full validation schema. Defined separately because
 * .omit() cannot be called on a schema that already has a .refine() applied.
 */
const PatchOrgBaseSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().min(1).optional(),
  partof_display: z.string().optional(),
});

/** Dto variant (no id) used by the service interface update method. */
export const PatchOrgDtoSchema = PatchOrgBaseSchema;
export type TPatchOrgDto = z.infer<typeof PatchOrgDtoSchema>;

/**
 * Full patch validation schema — includes id and enforces that at least one
 * patchable field is present. Mirrors fhir-gql's PatchOrgSchema contract.
 * Child arrays (identifier, type, alias, telecom, address, contact, endpoint)
 * are NOT patchable — delete and re-create to correct those.
 */
export const PatchOrgValidationSchema = PatchOrgBaseSchema.extend({
  id: z.number(),
}).refine(
  ({ active, name, partof_display }) =>
    active !== undefined || name !== undefined || partof_display !== undefined,
  { message: "At least one field must be provided for update" },
);
export type TPatchOrg = z.infer<typeof PatchOrgValidationSchema>;

/** Query parameters for listing organizations (server-side filtering + pagination). */
export const ListOrgsValidationSchema = z.object({
  name: z.string().optional(),
  active: z.boolean().optional(),
  /** Filter by owning user — matches the JWT subject stored on each resource. */
  user_id: z.string().optional(),
  /** Filter by tenant organization ID — scopes results to a single tenant. */
  org_id: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});
export type TListOrgsQuery = z.infer<typeof ListOrgsValidationSchema>;

export const GetOrgByIdValidationSchema = z.object({ id: z.number() });
export type TGetOrgById = z.infer<typeof GetOrgByIdValidationSchema>;

export const DeleteOrgValidationSchema = z.object({ id: z.number() });
export type TDeleteOrg = z.infer<typeof DeleteOrgValidationSchema>;

// ── Action schemas (ZSA transport-layer input) ────────────────────────────────
// TransportOptionsSchema is imported from entities/schemas/transport — single canonical source.

export const RegisterOrgActionSchema = z.object({
  payload: RegisterOrgValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TRegisterOrgAction = z.infer<typeof RegisterOrgActionSchema>;

/** Reads have no transportOptions — no side effects after a fetch. */
export const ListOrgsActionSchema = z.object({
  payload: ListOrgsValidationSchema.optional(),
});
export type TListOrgsAction = z.infer<typeof ListOrgsActionSchema>;

export const GetOrgByIdActionSchema = z.object({
  payload: GetOrgByIdValidationSchema,
});
export type TGetOrgByIdAction = z.infer<typeof GetOrgByIdActionSchema>;

export const PatchOrgActionSchema = z.object({
  payload: PatchOrgValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TPatchOrgAction = z.infer<typeof PatchOrgActionSchema>;

export const DeleteOrgActionSchema = z.object({
  payload: DeleteOrgValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeleteOrgAction = z.infer<typeof DeleteOrgActionSchema>;

// ── Form schemas (client-side UI layer) ───────────────────────────────────────
// CreateOrgFormSchema mirrors RegisterOrgValidationSchema but uses string for
// string-array fields (name_given, address_line, etc.) — the modal's handleSubmit
// splits comma-separated values back into arrays before calling the action.

/**
 * Address sub-schema for the create form.
 * `line` is a single string (one street-address line) instead of string[].
 * The modal wraps it in an array before sending to the API.
 */
export const OrgAddressFormItemSchema = OrgAddressInputSchema.extend({
  line: z.string().optional(),
});
export type TOrgAddressFormItem = z.infer<typeof OrgAddressFormItemSchema>;

/**
 * Contact person sub-schema for the create form.
 * String-array fields (name_given, name_prefix, name_suffix, address_line)
 * are represented as comma-separated strings and split by the modal.
 */
export const OrgContactFormItemSchema = z.object({
  purpose_system: z.string().optional(),
  purpose_code: z.string().optional(),
  purpose_display: z.string().optional(),
  purpose_text: z.string().optional(),
  name_use: z.enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]).optional(),
  name_text: z.string().optional(),
  name_family: z.string().optional(),
  /** Comma-separated given names, e.g. "John Michael". */
  name_given: z.string().optional(),
  /** Comma-separated prefixes, e.g. "Dr., Prof.". */
  name_prefix: z.string().optional(),
  /** Comma-separated suffixes, e.g. "MD, PhD". */
  name_suffix: z.string().optional(),
  address_use: z.enum(["home", "work", "temp", "old", "billing"]).optional(),
  address_type: z.enum(["postal", "physical", "both"]).optional(),
  address_text: z.string().optional(),
  /** Comma-separated street address lines. */
  address_line: z.string().optional(),
  address_city: z.string().optional(),
  address_district: z.string().optional(),
  address_state: z.string().optional(),
  address_postal_code: z.string().optional(),
  address_country: z.string().optional(),
  telecom: z.array(OrgContactTelecomInputSchema).optional(),
});
export type TOrgContactFormItem = z.infer<typeof OrgContactFormItemSchema>;

/**
 * Full form schema for the "Create Organization" modal.
 * Covers all fields accepted by fhir-gql's RegisterOrgSchema.
 * Uses form sub-schemas for address and contact where string arrays are
 * represented as comma-separated strings for simpler input handling.
 */
export const CreateOrgFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.array(OrgTypeInputSchema).min(1, "At least one organization type is required"),
  active: z.boolean(),
  partof: z.string().optional(),
  partof_display: z.string().optional(),
  identifier: z.array(OrgIdentifierInputSchema).optional(),
  alias: z.array(z.object({ value: z.string().min(1) })).optional(),
  telecom: z.array(OrgTelecomInputSchema).optional(),
  address: z.array(OrgAddressFormItemSchema).optional(),
  contact: z.array(OrgContactFormItemSchema).optional(),
  endpoint: z.array(OrgEndpointInputSchema).optional(),
});
export type TCreateOrgFormSchema = z.infer<typeof CreateOrgFormSchema>;

/**
 * Form schema for the "Edit Organization" modal.
 * Only exposes the three patchable scalar fields per the fhir-gql PATCH contract.
 * Child arrays are not editable here — delete and re-create to change those.
 */
export const EditOrgFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  active: z.boolean(),
  partof_display: z.string().optional(),
});
export type TEditOrgFormSchema = z.infer<typeof EditOrgFormSchema>;
