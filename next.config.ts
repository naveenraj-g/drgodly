import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  experimental: {
    // Required for app/global-not-found.tsx. This app's root layout lives at
    // [locale]/layout.tsx (a dynamic top-level segment, not a plain
    // app/layout.tsx), which Next.js can't compose a single 404 route
    // through on its own — see app/global-not-found.tsx for the full
    // explanation. Confirmed necessary: a sibling [locale]/not-found.tsx was
    // tried first, and Turbopack hung indefinitely compiling the synthetic
    // /_not-found route for any unmatched URL; removing that file and
    // relying on this flag + global-not-found.tsx instead resolved the same
    // requests in well under a second (as opposed to a notFound() call
    // thrown from within an already-matched (apps) page, which
    // (apps)/not-found.tsx handles fine on its own, navbar included).
    globalNotFound: true,
    serverComponentsHmrCache: false,
  },
  // Lets the client detect when it's talking to a server from a different
  // build (e.g. after a production redeploy) and force a hard navigation
  // instead of failing with "Failed to find Server Action" — see
  // docker-build.sh for how this is set at build time.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  webpack: (config, { dev }) => {
    // Only disable source maps in development
    if (dev) {
      config.devtool = false;
    }
    return config;
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
