import { redirect } from "@/i18n/navigation";
import { getServerSession } from "@/modules/server/auth/get-session";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

const BezsPage = async () => {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  const url = session.session.activeRoleRedirectUrl ?? "/bezs/settings";

  redirect({ href: url, locale });
  return null;
};

export default BezsPage;
