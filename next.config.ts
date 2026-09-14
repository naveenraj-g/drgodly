import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  // Lets the client detect when it's talking to a server from a different
  // build (e.g. after a production redeploy) and force a hard navigation
  // instead of failing with "Failed to find Server Action" — see
  // docker-build.sh for how this is set at build time.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
