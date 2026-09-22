/**
 * Patient Chart Review session page — doctor analytics dashboard.
 *
 * Layer: app / pages
 * Route: /[locale]/telemedicine/doctor/emr-analysis/[sessionId]
 *
 * Server page for an existing chart-review session. Loads the full session
 * (messages + active workflow state) from the database and passes it to
 * EMRChatContainer as `initialSession` so the client renders instantly
 * without a loading flash — no second DB round-trip on mount.
 *
 * Security: getSessionController itself scopes the lookup to the calling
 * user (throws NotFoundError for another user's session), so a forged
 * sessionId in the URL cannot leak another doctor's session.
 */

import { notFound } from "next/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { requirePractitionerProfile } from "@/modules/server/auth/require-profile";
import { getSessionController } from "@/modules/server/core/emr-chat/interface-adapters/controllers";
import EMRChatContainer from "@/modules/client/emr-chat/components/EMRChatContainer";

interface EmrAnalysisSessionPageProps {
  params: Promise<{ locale: string; sessionId: string }>;
}

/**
 * Loads and renders an existing Patient Chart Review session.
 * Passes the pre-fetched session as a prop to avoid a client-side DB round-trip.
 *
 * @param params - Route params containing locale and sessionId.
 */
export default async function EmrAnalysisSessionPage({
  params,
}: EmrAnalysisSessionPageProps) {
  const { sessionId } = await params;
  const authSession = await getServerSession();
  const userId = authSession?.user?.id ?? "";
  const orgId = authSession?.session?.activeOrganizationId ?? null;

  // Redirects to /doctor/settings/profile if no FHIR Practitioner record exists
  await requirePractitionerProfile();

  let initialSession;
  try {
    initialSession = await getSessionController(sessionId, userId);
  } catch {
    notFound();
  }

  return (
    <EMRChatContainer
      userId={userId}
      orgId={orgId}
      sessionId={sessionId}
      initialSession={initialSession}
      basePath="/bezs/telemedicine/doctor/emr-analysis"
      workflowType="analysis"
    />
  );
}
