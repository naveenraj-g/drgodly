import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";

const GenderSchema = z.enum(["male", "female", "other", "unknown"]);

export const PatientResponseSchema = z.object({
  id: z.number(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  active: z.boolean().optional(),
  gender: GenderSchema.optional(),
  birth_date: z.string().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),
  marital_status_system: z.string().optional(),
  marital_status_code: z.string().optional(),
  marital_status_display: z.string().optional(),
  marital_status_text: z.string().optional(),
  multiple_birth_boolean: z.boolean().optional(),
  multiple_birth_integer: z.number().optional(),
  managing_organization_type: z.string().optional(),
  managing_organization_id: z.number().optional(),
  managing_organization_display: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type TPatientResponse = z.infer<typeof PatientResponseSchema>;

export const PaginatedPatientResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(PatientResponseSchema),
});
export type TPaginatedPatientResponse = z.infer<typeof PaginatedPatientResponseSchema>;

export const PatientSummarySchema = z.object({
  demographics: PatientResponseSchema,
  encounters: z.array(z.unknown()),
  conditions: z.array(z.unknown()),
  medications: z.array(z.unknown()),
});
export type TPatientSummary = z.infer<typeof PatientSummarySchema>;

// --- Input validation schemas ---

export const RegisterPatientValidationSchema = z.object({
  family_name: z.string().min(1),
  given_name: z.string().min(1),
  birth_date: z.string().min(1),
  gender: GenderSchema,
  user_id: z.string().min(1),
  org_id: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  marital_status_system: z.string().optional(),
  marital_status_code: z.string().optional(),
  marital_status_display: z.string().optional(),
  marital_status_text: z.string().optional(),
});
export type TRegisterPatient = z.infer<typeof RegisterPatientValidationSchema>;

export const ListPatientsValidationSchema = z.object({
  family_name: z.string().optional(),
  given_name: z.string().optional(),
  gender: GenderSchema.optional(),
  active: z.boolean().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type TListPatientsQuery = z.infer<typeof ListPatientsValidationSchema>;

export const UpdatePatientDtoSchema = z.object({
  gender: GenderSchema.optional(),
  birth_date: z.string().optional(),
  active: z.boolean().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),
  marital_status_system: z.string().optional(),
  marital_status_code: z.string().optional(),
  marital_status_display: z.string().optional(),
  marital_status_text: z.string().optional(),
  multiple_birth_boolean: z.boolean().optional(),
  multiple_birth_integer: z.number().optional(),
  managing_organization: z.string().optional(),
});
export type TUpdatePatientDto = z.infer<typeof UpdatePatientDtoSchema>;

export const UpdatePatientValidationSchema = UpdatePatientDtoSchema.extend({
  id: z.number(),
});
export type TUpdatePatient = z.infer<typeof UpdatePatientValidationSchema>;

export const GetPatientByIdValidationSchema = z.object({ id: z.number() });
export type TGetPatientById = z.infer<typeof GetPatientByIdValidationSchema>;

export const GetPatientSummaryValidationSchema = z.object({ id: z.number() });
export type TGetPatientSummary = z.infer<typeof GetPatientSummaryValidationSchema>;

export const DeletePatientValidationSchema = z.object({ id: z.number() });
export type TDeletePatient = z.infer<typeof DeletePatientValidationSchema>;

// --- Action schemas (ZSA transport layer input) ---
// TransportOptionsSchema imported from entities/schemas/transport — canonical source.

export const RegisterPatientActionSchema = z.object({
  payload: RegisterPatientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TRegisterPatientAction = z.infer<typeof RegisterPatientActionSchema>;

export const ListPatientsActionSchema = z.object({
  payload: ListPatientsValidationSchema.optional(),
});
export type TListPatientsAction = z.infer<typeof ListPatientsActionSchema>;

export const GetPatientByIdActionSchema = z.object({
  payload: GetPatientByIdValidationSchema,
});
export type TGetPatientByIdAction = z.infer<typeof GetPatientByIdActionSchema>;

export const GetPatientSummaryActionSchema = z.object({
  payload: GetPatientSummaryValidationSchema,
});
export type TGetPatientSummaryAction = z.infer<typeof GetPatientSummaryActionSchema>;

export const UpdatePatientActionSchema = z.object({
  payload: UpdatePatientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdatePatientAction = z.infer<typeof UpdatePatientActionSchema>;

export const DeletePatientActionSchema = z.object({
  payload: DeletePatientValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDeletePatientAction = z.infer<typeof DeletePatientActionSchema>;
