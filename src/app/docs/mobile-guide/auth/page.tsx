/**
 * /docs/mobile-guide/auth — the authentication model every other page assumes.
 *
 * Layer: app / docs / mobile-guide
 */

import Link from "next/link";
import { CodeBlock } from "@/modules/client/docs/components/CodeBlock";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MethodBadge } from "@/modules/client/docs/components/Badges";

export default function AuthPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Authentication</h1>
        <p className="text-sm text-muted-foreground">
          Every API in this guide — FHIR, the AI agents, and this app&apos;s own Mobile API — is protected by
          exactly <strong>one</strong> credential: a Better Auth-issued JWT sent as{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">Authorization: Bearer &lt;token&gt;</code>. There is
          no separate API key per system. One exception exists — see the callout at the bottom.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium">Why the web app can&apos;t just be copied as-is</p>
        <p className="text-sm text-muted-foreground">
          The web app&apos;s server actions authenticate via a <strong>browser session cookie</strong> — a
          server component reads the cookie, forwards it to Better Auth, and gets a session back. A mobile
          app has no browser cookie jar in that sense, so it can&apos;t call the server actions or the
          cookie-gated proxy routes directly. Instead, it does the same two-step exchange this app&apos;s own{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">getAuthToken()</code> helper does server-side —
          just from the mobile client instead of from Next.js.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Step 1 — sign in</p>
        <p className="text-sm text-muted-foreground">Two ways to establish a session. Pick one.</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="gap-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Option A — OAuth 2.0 Authorization Code + PKCE</p>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Recommended
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            This is what the web app itself actually does — see{" "}
            <code className="rounded bg-muted px-1 py-0.5">OAuthPkceButton.tsx</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5">(auth)/callback/page.tsx</code> in this repo for the
            reference implementation. It&apos;s the standard for native apps (RFC 8252): the app never sees the
            user&apos;s password, and 2FA/social login/SSO all keep working without the mobile app knowing
            about them.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <span className="font-semibold">Not a WebView/iframe.</span> Open the authorize URL below in a system
            browser tab — <code className="rounded bg-black/10 px-1 dark:bg-white/10">ASWebAuthenticationSession</code> on
            iOS, <code className="rounded bg-black/10 px-1 dark:bg-white/10">Custom Tabs</code> on Android (or a
            cross-platform wrapper like AppAuth / Expo AuthSession) — not an embedded WebView. Login pages commonly
            block being framed at all, and app stores treat a password page inside an app-controlled WebView as a
            phishing risk; a system browser tab is what both platforms and Better Auth expect here.
          </p>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">1. Generate PKCE material and open the browser</p>
            <CodeBlock
              value={
                "code_verifier = random 43-128 char string\n" +
                "code_challenge = base64url(SHA-256(code_verifier))\n" +
                "state = random string (CSRF nonce)\n\n" +
                "open in system browser tab:\n" +
                "GET {BETTER_AUTH_URL}/api/auth/oauth2/authorize" +
                "?client_id=<mobile_client_id>" +
                "&redirect_uri=<your app's registered redirect, e.g. com.drgodly.app://callback>" +
                "&response_type=code" +
                "&scope=openid profile email offline_access" +
                "&state=<state>" +
                "&code_challenge=<code_challenge>" +
                "&code_challenge_method=S256"
              }
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">2. User signs in on the IAM&apos;s hosted page, gets redirected back</p>
            <CodeBlock value={"<your app's redirect_uri>?code=<authorization_code>&state=<state>"} />
            <p className="text-xs text-muted-foreground">
              Verify the returned <code className="rounded bg-muted px-1 py-0.5">state</code> matches what you generated in step 1 before proceeding — same CSRF check the web callback does.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">3. Exchange the code for tokens</p>
            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method="POST" />
              <code className="text-sm font-medium">{"{BETTER_AUTH_URL}"}/api/auth/oauth2/token</code>
            </div>
            <p className="text-xs text-muted-foreground">Content-Type: application/x-www-form-urlencoded</p>
            <CodeBlock label="Body" value={"grant_type=authorization_code&client_id=<mobile_client_id>&code=<code>&code_verifier=<code_verifier>&redirect_uri=<same redirect_uri as step 1>"} />
            <CodeBlock label="Response" value={{ access_token: "...", token_type: "Bearer", expires_in: 900, refresh_token: "...", id_token: "..." }} />
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
              <span className="font-semibold">Confirm before building:</span> this app&apos;s own token exchange (<code className="rounded bg-black/10 px-1 dark:bg-white/10">/api/auth/token</code> in
              this repo) sends a <code className="rounded bg-black/10 px-1 dark:bg-white/10">client_secret</code> alongside PKCE — but a
              native app is a <em>public</em> client and shouldn&apos;t embed one (it can&apos;t be kept secret in a
              shipped binary). Ask the IAM team for a separate, secret-less mobile client_id registered for PKCE-only
              exchange; don&apos;t reuse the web app&apos;s confidential client_id/secret in the mobile app. Also confirm
              whether the resulting <code className="rounded bg-black/10 px-1 dark:bg-white/10">access_token</code> above
              is directly usable as the bearer token in Step 3 below, or whether you still need to follow up with
              Step 2 (mint a JWT) using the session this exchange establishes — the web app always does the latter.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <p className="text-sm font-medium">Option B — direct email/password</p>
          <p className="text-xs text-muted-foreground">
            Simpler, but the app collects the password itself and 2FA/SSO/social login don&apos;t come for free.
            Fine for an internal test client; not what the web app itself uses. Most HTTP clients (iOS{" "}
            <code className="rounded bg-muted px-1 py-0.5">URLSession</code>, Android{" "}
            <code className="rounded bg-muted px-1 py-0.5">OkHttp</code>) persist the response&apos;s session
            cookie automatically — keep using the same client/cookie-jar for step 2.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method="POST" />
            <code className="text-sm font-medium">{"{BETTER_AUTH_URL}"}/api/auth/sign-in/email</code>
          </div>
          <CodeBlock label="Request body" value={{ email: "doctor@example.com", password: "••••••••" }} />
          <p className="text-xs text-muted-foreground">
            Confirm the exact response shape against the live IAM service before building on this — Better
            Auth&apos;s config lives in a separate repo this guide doesn&apos;t own.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <p className="text-sm font-medium">Step 2 — exchange the session for a JWT</p>
          <p className="text-xs text-muted-foreground">
            Same call this app&apos;s server makes on every request that talks to FHIR or an agent — send the
            session from step 1 (cookie for Option B; confirm the equivalent for Option A per the callout above),
            get back a short-lived JWT.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method="GET" />
            <code className="text-sm font-medium">{"{BETTER_AUTH_URL}"}/api/auth/token</code>
          </div>
          <CodeBlock label="Response" value={{ token: "eyJhbGciOiJFZERTQSIs..." }} />
          <p className="text-xs text-muted-foreground">
            Response key may be <code className="rounded bg-muted px-1 py-0.5">token</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5">jwt</code>, or{" "}
            <code className="rounded bg-muted px-1 py-0.5">access_token</code> depending on IAM config — this
            app&apos;s own <code className="rounded bg-muted px-1 py-0.5">getAuthToken()</code> checks all three.
            The token expires quickly (minutes, not hours) — re-mint it, don&apos;t cache it long-term.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <p className="text-sm font-medium">Step 3 — use it everywhere</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <CodeBlock value={"Authorization: Bearer eyJhbGciOiJFZERTQSIs..."} />
          <p className="text-sm text-muted-foreground">
            Send this same header to FHIR_GQL_URL directly (see{" "}
            <Link href="/docs/mobile-guide/fhir" className="underline underline-offset-2">FHIR resources</Link>),
            to any agent host directly (see{" "}
            <Link href="/docs/mobile-guide/agents" className="underline underline-offset-2">AI agents</Link>),
            and to this app&apos;s own Mobile API (see{" "}
            <Link href="/docs/mobile-guide/mobile-api" className="underline underline-offset-2">Mobile API</Link>).
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-medium">What&apos;s inside the token</p>
        <p className="text-sm text-muted-foreground">
          By default Better Auth&apos;s JWT plugin signs the session&apos;s user object, with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">sub</code> set to the user id. That means:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><code className="rounded bg-muted px-1 py-0.5">sub</code> (user id) is always reliable — every server-side endpoint that stamps a userId/user_id from &quot;the token&quot; means this claim.</li>
          <li>
            An organization claim (e.g. <code className="rounded bg-muted px-1 py-0.5">activeOrganizationId</code>) is <strong>not</strong> guaranteed —
            it depends on whether the IAM service customized the JWT payload. This app&apos;s Mobile API reads it defensively
            and treats it as possibly undefined; confirm against the live IAM before assuming org scoping works end to end.
          </li>
        </ul>
      </div>

      <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-400">
        <span className="font-semibold">One exception: FHIR staging has no auth at all.</span> The{" "}
        <Link href="/docs/mobile-guide/fhir-staging" className="underline underline-offset-2">FHIR staging service</Link>{" "}
        doesn&apos;t check an Authorization header — see that page for details. Two more gaps worth knowing before you build:{" "}
        <Link href="/docs/mobile-guide/attachments" className="underline underline-offset-2">file attachments</Link> and{" "}
        <Link href="/docs/mobile-guide/voice-consultation" className="underline underline-offset-2">voice tokens</Link>{" "}
        are still cookie-gated today and need bearer-JWT proxies built before mobile can use them.
      </p>
    </div>
  );
}
