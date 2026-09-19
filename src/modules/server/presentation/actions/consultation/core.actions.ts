/**
 * Consultation core server actions.
 *
 * Layer: presentation / actions / consultation
 *
 * All 5 consultation operations as ZSA server actions using authenticatedProcedure.
 * createConsultationAction injects user_id from the session so the client never
 * supplies it directly (preventing impersonation). Pattern mirrors intake/core.actions.ts.
 */

"use server";

import type { AuthResponse } from "@/modules/server/auth/types";
import {
  CreateConsultationActionSchema,
  CompleteConsultationActionSchema,
  SaveClinicalDataActionSchema,
  SaveClinicalDraftActionSchema,
  AbandonConsultationActionSchema,
  GetConsultationByFhirAppointmentIdActionSchema,
  ListConsultationsActionSchema,
  type TCreateConsultationAction,
  type TCompleteConsultationAction,
  type TSaveClinicalDataAction,
  type TSaveClinicalDraftAction,
  type TAbandonConsultationAction,
  type TGetConsultationByFhirAppointmentIdAction,
  type TListConsultationsAction,
} from "@/modules/entities/schemas/consultation";
import {
  createConsultationController,
  completeConsultationController,
  saveClinicalDataController,
  saveClinicalDraftController,
  abandonConsultationController,
  getConsultationByFhirAppointmentIdController,
  listConsultationsController,
  type TCreateConsultationControllerOutput,
  type TCompleteConsultationControllerOutput,
  type TSaveClinicalDataControllerOutput,
  type TSaveClinicalDraftControllerOutput,
  type TAbandonConsultationControllerOutput,
  type TGetConsultationByFhirAppointmentIdControllerOutput,
  type TListConsultationsControllerOutput,
} from "@/modules/server/core/consultation/interface-adapters/controllers";
import { authenticatedProcedure } from "../procedures";

/**
 * Provisions a WAITING consultation room immediately after a FHIR appointment
 * is booked. user_id and org_id are injected from the session — the client
 * provides only fhir_appointment_id.
 */
export const createConsultationAction = authenticatedProcedure
  .createServerAction()
  .input(CreateConsultationActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TCreateConsultationAction;
      ctx: { session: AuthResponse };
    }): Promise<TCreateConsultationControllerOutput> => {
      // Inject user_id/org_id from session — client cannot impersonate another
      // user or attribute the room to another tenant
      const enrichedPayload = {
        ...input.payload,
        user_id: ctx.session.session.userId,
        org_id: ctx.session.session.activeOrganizationId ?? undefined,
      };
      return createConsultationController(enrichedPayload);
    },
  );

/**
 * Called by the doctor on end-call to write the transcript, SOAP note,
 * and merged full report, then flip status to COMPLETED.
 */
export const completeConsultationAction = authenticatedProcedure
  .createServerAction()
  .input(CompleteConsultationActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TCompleteConsultationAction;
    }): Promise<TCompleteConsultationControllerOutput> => {
      return completeConsultationController(input.payload);
    },
  );

/**
 * Saves FHIR clinical resources extracted by the clinical-extraction-agent
 * in the post-consultation review step.
 */
export const saveClinicalDataAction = authenticatedProcedure
  .createServerAction()
  .input(SaveClinicalDataActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TSaveClinicalDataAction;
      ctx: { session: AuthResponse };
    }): Promise<TSaveClinicalDataControllerOutput> => {
      /* The approver comes from the session, never the request body — the
         client sends mark_published as intent only, so a doctor cannot be
         recorded as having approved a record they did not. */
      const enrichedPayload = {
        ...input.payload,
        published_by: ctx.session.session.userId,
      };
      return saveClinicalDataController(enrichedPayload);
    },
  );

/**
 * Autosaves the review page's in-progress working copy (SOAP note + the four
 * clinical extraction lists) on a debounce, or clears it with `clear: true`
 * right after a successful Confirm & Save. Never marks anything published.
 */
export const saveClinicalDraftAction = authenticatedProcedure
  .createServerAction()
  .input(SaveClinicalDraftActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TSaveClinicalDraftAction;
    }): Promise<TSaveClinicalDraftControllerOutput> => {
      return saveClinicalDraftController(input.payload);
    },
  );

/**
 * Marks the consultation ABANDONED when a participant leaves without
 * completing the session (e.g. browser close, network drop).
 */
export const abandonConsultationAction = authenticatedProcedure
  .createServerAction()
  .input(AbandonConsultationActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TAbandonConsultationAction;
    }): Promise<TAbandonConsultationControllerOutput> => {
      return abandonConsultationController(input.payload);
    },
  );

/**
 * Fetches the consultation linked to a specific FHIR appointment.
 * Returns null if no consultation was provisioned (pre-feature bookings).
 */
export const getConsultationByFhirAppointmentIdAction = authenticatedProcedure
  .createServerAction()
  .input(GetConsultationByFhirAppointmentIdActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
    }: {
      input: TGetConsultationByFhirAppointmentIdAction;
    }): Promise<TGetConsultationByFhirAppointmentIdControllerOutput> => {
      return getConsultationByFhirAppointmentIdController(input.payload);
    },
  );

/**
 * Returns a paginated list of AI Consultation records.
 * Patient portal passes user_id to scope to own records.
 * Admin/doctor portal can omit user_id to see org-wide records — org_id
 * itself is injected from the session, so that "org-wide" is always the
 * caller's own org, never one supplied by the client.
 */
export const listConsultationsAction = authenticatedProcedure
  .createServerAction()
  .input(ListConsultationsActionSchema, { skipInputParsing: true })
  .handler(
    async ({
      input,
      ctx,
    }: {
      input: TListConsultationsAction;
      ctx: { session: AuthResponse };
    }): Promise<TListConsultationsControllerOutput> => {
      // Inject org_id from session — client cannot list another org's consultations
      const enrichedPayload = {
        ...input.payload,
        org_id: ctx.session.session.activeOrganizationId ?? undefined,
      };
      return listConsultationsController(enrichedPayload);
    },
  );
