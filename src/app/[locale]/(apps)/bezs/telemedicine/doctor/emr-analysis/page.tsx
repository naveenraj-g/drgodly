/**
 * Patient Chart Review — doctor analytics dashboard entry point.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/doctor/emr-analysis
 *
 * Server component. Guards:
 *  1. Redirects to /login if no session.
 *  2. Redirects to /doctor/settings/profile if no FHIR Practitioner record
 *     exists (same guard as Clinical Records — the workflow's own first
 *     step also resolves the practitioner, but this avoids a wasted
 *     round-trip into the chat for a doctor who can't use it yet).
 *
 * Reuses EMRChatContainer (the same engine as the admin EMR chat) with
 * `workflowType="analysis"` — the Workflows tab's launcher grid only lists
 * workflows tagged workflow_type: "analysis" (currently just
 * patient_chart_review), matching how the general EMR chat page lists
 * everything else via workflowType="chat".
 */

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import EMRChatContainer from "@/modules/client/emr-chat/components/EMRChatContainer";

/**
 * Patient Chart Review landing page — blank new-session state.
 * Session history (past chart reviews) is reached via the History icon,
 * same as EMR Chat.
 */
export default async function EmrAnalysisPage() {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  // Redirects to /doctor/settings/profile if no FHIR Practitioner record exists
  await requirePractitionerProfile();

  const userId = session.user?.id ?? "";
  const orgId = session.session?.activeOrganizationId ?? null;

  return (
    <EMRChatContainer
      userId={userId}
      orgId={orgId}
      basePath="/bezs/telemedicine/doctor/emr-analysis"
      workflowType="analysis"
    />
  );
}
