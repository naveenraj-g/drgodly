-- Adds an autosaved draft layer to consultations, separate from the
-- confirmed/published columns.
--
-- draft_updated_at is the presence signal: null means there is no pending
-- draft. The review page writes draft_* on a debounce while the doctor
-- types, and clears draft_updated_at (leaving the stale draft_* JSON in
-- place, but ignored) once Confirm & Save republishes the same data into
-- the existing conditions/observations/medication_requests/service_requests/
-- soap_note columns.
--
-- Kept as separate columns rather than reusing the existing ones so an
-- autosave can never clobber data that's already confirmed to the EMR
-- before the doctor re-confirms it.

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "draft_soap_note" JSONB,
ADD COLUMN     "draft_service_requests" JSONB,
ADD COLUMN     "draft_medication_requests" JSONB,
ADD COLUMN     "draft_observations" JSONB,
ADD COLUMN     "draft_conditions" JSONB,
ADD COLUMN     "draft_updated_at" TIMESTAMP(3);
