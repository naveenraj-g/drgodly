/**
 * Verify email page — email verification is handled by the IAM service.
 * Forwards the `token` query param (from the IAM verification email) to the
 * IAM verify-email screen to complete the verification flow.
 */
"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppLogo } from "@/modules/client/shared/components/AppLogo";

/** Reads the verification token from the URL and redirects to IAM with it. */
function VerifyRedirect() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const iamUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "";
    // Preserve the token so IAM can verify the email address.
    const dest = token
      ? `${iamUrl}/verify-email?token=${token}`
      : `${iamUrl}/verify-email`;
    window.location.href = dest;
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-4">
      <AppLogo size={40} className="h-10 w-10" />
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading…</p>
      }
    >
      <VerifyRedirect />
    </Suspense>
  );
}
