/**
 * Signup page — account creation is handled entirely by the IAM service.
 * This page immediately redirects the user to the IAM sign-up screen.
 */
"use client";

import { useEffect } from "react";
import { AppLogo } from "@/modules/client/shared/components/AppLogo";

/** Redirects to the IAM sign-up page on mount. */
export default function SignupPage() {
  useEffect(() => {
    const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
    window.location.href = `${iamUrl}/sign-up`;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <AppLogo size={40} className="h-10 w-10" />
      <p className="text-sm text-muted-foreground">Redirecting to sign up…</p>
    </div>
  );
}
