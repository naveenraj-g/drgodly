/**
 * PatientProfileForm — unified create/edit shell for the patient FHIR profile.
 *
 * Layer: client / telemedicine / patient / forms
 *
 * Thin orchestration layer — owns:
 *   - Form instance setup (react-hook-form + zod resolver)
 *   - Sequential upsert submit pipeline (patient → name → telecoms → address)
 *   - Page layout and sticky submit bar
 *
 * All field rendering lives in the section components under ./sections/.
 * Schema and default derivation live in ./schema.ts.
 *
 * Submit pipeline (create mode):
 *   1. createPatientFullAction — single atomic call that creates the patient
 *      + name + telecoms + address in one DB transaction (POST /patients/full).
 *
 * Submit pipeline (edit mode):
 *   1. updatePatientAction         — core scalar fields
 *   2. addPatientNameAction        — primary HumanName (or patch if exists)
 *   3. addPatientTelecomAction × N — phones + emails (or patch if exists)
 *   4. addPatientAddressAction     — primary address (or patch if exists)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { CircleAlert, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

import {
  createPatientFullAction,
  updatePatientAction,
  patchPatientNameAction,
  addPatientNameAction,
  patchPatientTelecomAction,
  addPatientTelecomAction,
  patchPatientAddressAction,
  addPatientAddressAction,
} from "@/modules/server/presentation/actions/patient";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import { ProfileFormSchema, deriveDefaults, type TProfileForm } from "./schema";
import { PersonalDetailsSection } from "./sections/PersonalDetailsSection";
import { ContactSection } from "./sections/ContactSection";
import { AddressSection } from "./sections/AddressSection";
import type { PatientProfileFormProps } from "./types";

/**
 * Single-page patient profile form for both initial setup and ongoing edits.
 *
 * @param initialPatient - Existing patient data or null (create mode).
 * @param userId         - The signed-in user's ID.
 * @param orgId          - The active organisation ID.
 */
export function PatientProfileForm({
  initialPatient,
  userId,
  orgId,
}: PatientProfileFormProps) {
  const router = useRouter();
  const isCreateMode = initialPatient === null;
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<TProfileForm>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: deriveDefaults(initialPatient),
  });

  // ── Submit handler ────────────────────────────────────────────────────────────

  /**
   * Sequential upsert pipeline. Returns early on the first error — errors are
   * surfaced via handleZSAError (toast) rather than thrown.
   *
   * @param values - Validated flat form values.
   */
  async function onSubmit(values: TProfileForm) {
    setIsSaving(true);

    try {
      const birthDateStr = values.birth_date
        ? format(values.birth_date, "yyyy-MM-dd")
        : undefined;

      if (isCreateMode) {
        // ── Create mode: single atomic request ─────────────────────────────────
        // POST /patients/full creates the patient and all sub-resources in one
        // DB transaction, replacing the previous 7-step sequential pipeline.

        const telecoms = [
          values.phone
            ? { system: "phone" as const, value: values.phone, rank: 1 }
            : null,
          values.alt_phone
            ? { system: "phone" as const, value: values.alt_phone, rank: 2 }
            : null,
          values.email
            ? { system: "email" as const, value: values.email, rank: 1 }
            : null,
          values.alt_email
            ? { system: "email" as const, value: values.alt_email, rank: 2 }
            : null,
        ].filter((t): t is NonNullable<typeof t> => t !== null);

        const hasAddress = !!(
          values.address_line ||
          values.address_city ||
          values.address_state ||
          values.address_postal_code
        );

        const [, err] = await createPatientFullAction({
          payload: {
            user_id: userId,
            org_id: orgId,
            active: true,
            gender: values.gender || undefined,
            birth_date: birthDateStr,
            names:
              values.family_name || values.given_name
                ? [
                    {
                      family: values.family_name || undefined,
                      given: values.given_name
                        ? [values.given_name]
                        : undefined,
                    },
                  ]
                : undefined,
            telecom: telecoms.length ? telecoms : undefined,
            addresses: hasAddress
              ? [
                  {
                    line: values.address_line
                      ? [values.address_line]
                      : undefined,
                    city: values.address_city || undefined,
                    state: values.address_state || undefined,
                    postal_code: values.address_postal_code || undefined,
                  },
                ]
              : undefined,
          },
        });
        if (err) {
          handleZSAError({ err });
          return;
        }
      } else {
        // ── Edit mode: individual patch calls per sub-resource ──────────────────

        const patientId = initialPatient.id;

        // 1. Core scalar fields
        const [, coreErr] = await updatePatientAction({
          payload: {
            id: patientId,
            gender: values.gender || undefined,
            birth_date: birthDateStr,
          },
        });
        if (coreErr) {
          handleZSAError({ err: coreErr });
          return;
        }

        // 2. Primary name
        if (values.family_name || values.given_name) {
          const base = {
            patient_id: patientId,
            family: values.family_name || undefined,
            given: values.given_name ? [values.given_name] : undefined,
          };
          const existing = initialPatient?.name?.[0];
          const [, err] = existing
            ? await patchPatientNameAction({
                payload: { ...base, item_id: existing.id },
              })
            : await addPatientNameAction({ payload: base });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }

        // 3–4. Phones
        const phones =
          initialPatient?.telecom?.filter((t) => t.system === "phone") ?? [];
        if (values.phone) {
          const [, err] = phones[0]
            ? await patchPatientTelecomAction({
                payload: {
                  patient_id: patientId,
                  item_id: phones[0].id,
                  system: "phone",
                  value: values.phone,
                },
              })
            : await addPatientTelecomAction({
                payload: {
                  patient_id: patientId,
                  system: "phone",
                  value: values.phone,
                  rank: 1,
                },
              });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }
        if (values.alt_phone) {
          const [, err] = phones[1]
            ? await patchPatientTelecomAction({
                payload: {
                  patient_id: patientId,
                  item_id: phones[1].id,
                  system: "phone",
                  value: values.alt_phone,
                },
              })
            : await addPatientTelecomAction({
                payload: {
                  patient_id: patientId,
                  system: "phone",
                  value: values.alt_phone,
                  rank: 2,
                },
              });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }

        // 5–6. Emails
        const emails =
          initialPatient?.telecom?.filter((t) => t.system === "email") ?? [];
        if (values.email) {
          const [, err] = emails[0]
            ? await patchPatientTelecomAction({
                payload: {
                  patient_id: patientId,
                  item_id: emails[0].id,
                  system: "email",
                  value: values.email,
                },
              })
            : await addPatientTelecomAction({
                payload: {
                  patient_id: patientId,
                  system: "email",
                  value: values.email,
                  rank: 1,
                },
              });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }
        if (values.alt_email) {
          const [, err] = emails[1]
            ? await patchPatientTelecomAction({
                payload: {
                  patient_id: patientId,
                  item_id: emails[1].id,
                  system: "email",
                  value: values.alt_email,
                },
              })
            : await addPatientTelecomAction({
                payload: {
                  patient_id: patientId,
                  system: "email",
                  value: values.alt_email,
                  rank: 2,
                },
              });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }

        // 7. Address
        const hasAddress = !!(
          values.address_line ||
          values.address_city ||
          values.address_state ||
          values.address_postal_code
        );
        if (hasAddress) {
          const base = {
            patient_id: patientId,
            line: values.address_line ? [values.address_line] : undefined,
            city: values.address_city || undefined,
            state: values.address_state || undefined,
            postal_code: values.address_postal_code || undefined,
          };
          const existing = initialPatient?.address?.[0];
          const [, err] = existing
            ? await patchPatientAddressAction({
                payload: { ...base, item_id: existing.id },
              })
            : await addPatientAddressAction({ payload: base });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }
      }

      toast.success(isCreateMode ? "Profile created." : "Profile updated.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Patient Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isCreateMode
            ? "Complete your medical profile to get started."
            : "Your health information on file."}
        </p>
      </div>

      {/* Incomplete profile banner */}
      {isCreateMode && (
        <div className="flex items-center gap-2 bg-warning/20 text-warning px-4 py-2 rounded-full mb-6 text-sm font-medium">
          <CircleAlert className="size-4 shrink-0" />
          <span>Complete your profile first!</span>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col min-h-[calc(100dvh-10rem)] -mb-6"
        >
          <div className="flex flex-col gap-10 flex-1 mb-4">
            <PersonalDetailsSection />
            <ContactSection />
            <AddressSection />
          </div>

          {/* Sticky submit bar */}
          <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 border-t flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="w-full md:w-fit min-w-32"
            >
              {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isCreateMode ? "Set up profile" : "Save changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
