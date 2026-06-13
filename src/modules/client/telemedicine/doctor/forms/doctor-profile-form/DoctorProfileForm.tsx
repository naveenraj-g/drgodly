/**
 * DoctorProfileForm — unified create/edit shell for the practitioner FHIR profile.
 *
 * Layer: client / telemedicine / doctor / forms
 *
 * Thin orchestration layer — owns:
 *   - Form instance setup (react-hook-form + zod resolver)
 *   - Sequential upsert submit pipeline
 *   - Language diff (add new codes, delete removed codes)
 *   - Page layout and sticky submit bar
 *
 * All field rendering lives in the section components under ./sections/.
 * Schema and default derivation live in ./schema.ts.
 *
 * Submit pipeline (create mode):
 *   1. createPractitionerFullAction — single atomic call that creates the
 *      practitioner + name + telecoms + address + communications in one
 *      DB transaction (POST /practitioners/full).
 *
 * Submit pipeline (edit mode):
 *   1. updatePractitionerAction         — core scalar fields
 *   2. addPractitionerNameAction        — primary HumanName (or patch if exists)
 *   3. addPractitionerTelecomAction × N — phones + emails (or patch)
 *   4. addPractitionerAddressAction     — primary address (or patch)
 *   5. language diff — addPractitionerCommunicationAction for added codes,
 *      deletePractitionerCommunicationAction for removed codes
 *
 * Key schema differences from patient module:
 *   - Parent ID field is `practitionerId` (camelCase), not `patient_id`
 *   - Patch schemas use `nameId`, `telecomId`, `addressId`, `communicationId`
 *   - `prefix` is submitted as string[] (wrapped from the single form string)
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
  createPractitionerFullAction,
  updatePractitionerAction,
  addPractitionerNameAction,
  patchPractitionerNameAction,
  addPractitionerTelecomAction,
  patchPractitionerTelecomAction,
  addPractitionerAddressAction,
  patchPractitionerAddressAction,
  addPractitionerCommunicationAction,
  deletePractitionerCommunicationAction,
} from "@/modules/server/presentation/actions/practitioner";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

import {
  DoctorProfileFormSchema,
  deriveDefaults,
  type TDoctorProfileForm,
} from "./schema";
import { PersonalDetailsSection } from "./sections/PersonalDetailsSection";
import { ContactSection } from "./sections/ContactSection";
import { AddressSection } from "./sections/AddressSection";
import { LanguagesSection } from "./sections/LanguagesSection";
import type { DoctorProfileFormProps } from "./types";

/**
 * Single-page doctor profile form for both initial setup and ongoing edits.
 *
 * @param initialPractitioner - Existing practitioner data or null (create mode).
 * @param userId              - The signed-in user's ID.
 * @param orgId               - The active organisation ID.
 */
export function DoctorProfileForm({
  initialPractitioner,
  userId,
  orgId,
}: DoctorProfileFormProps) {
  const router = useRouter();
  const isCreateMode = initialPractitioner === null;
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<TDoctorProfileForm>({
    resolver: zodResolver(DoctorProfileFormSchema),
    defaultValues: deriveDefaults(initialPractitioner),
  });

  // ── Submit handler ────────────────────────────────────────────────────────────

  /**
   * Sequential upsert pipeline. Returns early on the first error.
   * Errors are surfaced via handleZSAError (toast).
   *
   * @param values - Validated flat form values.
   */
  async function onSubmit(values: TDoctorProfileForm) {
    setIsSaving(true);

    try {
      const birthDateStr = values.birth_date
        ? format(values.birth_date, "yyyy-MM-dd")
        : undefined;

      if (isCreateMode) {
        // ── Create mode: single atomic request ─────────────────────────────────
        // POST /practitioners/full creates the practitioner and all sub-resources
        // in one DB transaction, replacing the previous 8-step sequential pipeline.

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

        const [, err] = await createPractitionerFullAction({
          payload: {
            user_id: userId,
            org_id: orgId,
            active: true,
            gender: values.gender || undefined,
            birth_date: birthDateStr,
            names:
              values.family_name || values.given_name || values.prefix
                ? [
                    {
                      family: values.family_name || undefined,
                      given: values.given_name
                        ? [values.given_name]
                        : undefined,
                      // prefix is FHIR string[] — wrap the single form string
                      prefix: values.prefix ? [values.prefix] : undefined,
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
            communications: values.language_codes?.length
              ? values.language_codes.map((language_code) => ({
                  language_code,
                }))
              : undefined,
          },
        });
        if (err) {
          handleZSAError({ err });
          return;
        }
      } else {
        // ── Edit mode: individual patch calls per sub-resource ──────────────────

        const practitionerId = initialPractitioner.id;

        // 1. Core scalar fields
        const [, coreErr] = await updatePractitionerAction({
          payload: {
            id: practitionerId,
            gender: values.gender || undefined,
            birth_date: birthDateStr,
          },
        });
        if (coreErr) {
          handleZSAError({ err: coreErr });
          return;
        }

        // 2. Primary name
        if (values.family_name || values.given_name || values.prefix) {
          const base = {
            practitionerId,
            family: values.family_name || undefined,
            given: values.given_name ? [values.given_name] : undefined,
            // prefix is a FHIR string[] — wrap the single form value
            prefix: values.prefix ? [values.prefix] : undefined,
          };
          const existing = initialPractitioner?.name?.[0];
          const [, err] = existing
            ? await patchPractitionerNameAction({
                payload: { ...base, nameId: existing.id },
              })
            : await addPractitionerNameAction({ payload: base });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }

        // 3–4. Phones
        const phones =
          initialPractitioner?.telecom?.filter((t) => t.system === "phone") ??
          [];
        if (values.phone) {
          const [, err] = phones[0]
            ? await patchPractitionerTelecomAction({
                payload: {
                  practitionerId,
                  telecomId: phones[0].id,
                  system: "phone",
                  value: values.phone,
                },
              })
            : await addPractitionerTelecomAction({
                payload: {
                  practitionerId,
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
            ? await patchPractitionerTelecomAction({
                payload: {
                  practitionerId,
                  telecomId: phones[1].id,
                  system: "phone",
                  value: values.alt_phone,
                },
              })
            : await addPractitionerTelecomAction({
                payload: {
                  practitionerId,
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
          initialPractitioner?.telecom?.filter((t) => t.system === "email") ??
          [];
        if (values.email) {
          const [, err] = emails[0]
            ? await patchPractitionerTelecomAction({
                payload: {
                  practitionerId,
                  telecomId: emails[0].id,
                  system: "email",
                  value: values.email,
                },
              })
            : await addPractitionerTelecomAction({
                payload: {
                  practitionerId,
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
            ? await patchPractitionerTelecomAction({
                payload: {
                  practitionerId,
                  telecomId: emails[1].id,
                  system: "email",
                  value: values.alt_email,
                },
              })
            : await addPractitionerTelecomAction({
                payload: {
                  practitionerId,
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
            practitionerId,
            line: values.address_line ? [values.address_line] : undefined,
            city: values.address_city || undefined,
            state: values.address_state || undefined,
            postal_code: values.address_postal_code || undefined,
          };
          const existing = initialPractitioner?.address?.[0];
          const [, err] = existing
            ? await patchPractitionerAddressAction({
                payload: { ...base, addressId: existing.id },
              })
            : await addPractitionerAddressAction({ payload: base });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }

        // 8. Languages — diff add/delete
        const existingComms = initialPractitioner?.communication ?? [];
        const existingCodes = existingComms
          .map((c) => c.language_code)
          .filter((c): c is string => !!c);
        const newCodes = values.language_codes ?? [];

        const toAdd = newCodes.filter((code) => !existingCodes.includes(code));
        for (const language_code of toAdd) {
          const [, err] = await addPractitionerCommunicationAction({
            payload: { practitionerId, language_code },
          });
          if (err) {
            handleZSAError({ err });
            return;
          }
        }

        const toDelete = existingComms.filter(
          (c) => c.language_code && !newCodes.includes(c.language_code),
        );
        for (const comm of toDelete) {
          const [, err] = await deletePractitionerCommunicationAction({
            payload: { practitionerId, itemId: comm.id },
          });
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
        <h1 className="text-2xl font-bold text-foreground">Doctor Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isCreateMode
            ? "Complete your practitioner profile to get started."
            : "Your practitioner information on file."}
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
            <LanguagesSection />
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
