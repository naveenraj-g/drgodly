/**
 * Forgot password page — password reset is handled by the IAM service.
 * This page immediately redirects the user to the IAM forgot-password screen.
 */
"use client";

import { useEffect } from "react";
import { AppLogo } from "@/modules/client/shared/components/AppLogo";

/** Redirects to the IAM forgot-password page on mount. */
export default function ForgotPasswordPage() {
  useEffect(() => {
    const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
    window.location.href = `${iamUrl}/forgot-password`;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <AppLogo size={40} className="h-10 w-10" />
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}
