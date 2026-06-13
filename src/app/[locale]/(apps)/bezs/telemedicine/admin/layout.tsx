/**
 * Telemedicine admin layout — role guard for all /telemedicine/admin/* routes.
 *
 * Layer: app / layouts
 * Route: /[locale]/(apps)/telemedicine/admin
 *
 * This layout sits between the top-level (apps)/layout.tsx (which checks for
 * any valid session) and the admin pages. It adds the admin role check so that
 * only users whose active organization role is "admin" can access these routes.
 *
 * Any authenticated user who fails the role check is redirected to /unauthorized.
 * The session is already resolved by the parent (apps)/layout.tsx, but we must
 * call getServerSession() again here — Server Component layouts do not receive
 * session as a prop from their parent.
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import { requireRole } from "@/modules/server/shared/auth/require-role";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

/**
 * Admin area layout. Renders children only when the user has the "admin" role.
 *
 * @param children - The admin page content to render.
 */
const TelemedicineAdminLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = await getServerSession();
  const locale = await getLocale();

  // Redirect unauthenticated users to login (safety net — parent layout handles this too).
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }

  // Role guard — redirects non-admin users to /unauthorized.
  await requireRole(session, "telemedicine-admin");

  return <>{children}</>;
};

export default TelemedicineAdminLayout;
