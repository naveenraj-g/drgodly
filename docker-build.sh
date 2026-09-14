#!/usr/bin/env bash
# Build the Docker image, reading NEXT_PUBLIC_* vars from .env so they
# get baked into the client bundle correctly.
#
# Usage:
#   ./docker-build.sh                          # uses .env, tags drgodly:latest
#   ./docker-build.sh .env.vps drgodly:1.0.0  # custom env file and tag

set -euo pipefail

ENV_FILE="${1:-.env}"
IMAGE_TAG="${2:-drgodly:latest}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file '$ENV_FILE' not found."
  echo "Usage: ./docker-build.sh [.env] [image-tag]"
  exit 1
fi

# Extract a NEXT_PUBLIC_* value from the env file
get_var() {
  grep -E "^${1}=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'"
}

# Server Actions encryption key must stay IDENTICAL across builds/instances —
# generating a new one every build is what causes "Failed to find Server
# Action" errors after a redeploy (see next.config.ts / self-hosting docs).
# Set NEXT_SERVER_ACTIONS_ENCRYPTION_KEY in $ENV_FILE once (generate with
# `openssl rand -base64 32`) and reuse it for every subsequent build.
#
# Passed to `docker build` as a BuildKit secret (--secret, read by the
# Dockerfile via --mount=type=secret) rather than --build-arg, so it never
# ends up in the image's layer history/metadata (docker history/inspect).
# `--secret id=...,env=VAR` reads VAR from *this* shell's environment, so it
# must be exported here rather than just passed inline as a build-arg value.
export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(get_var NEXT_SERVER_ACTIONS_ENCRYPTION_KEY)"
if [ -z "$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY" ]; then
  echo "Warning: NEXT_SERVER_ACTIONS_ENCRYPTION_KEY not set in $ENV_FILE."
  echo "  A random key will be used for this build only, which will cause"
  echo "  \"Failed to find Server Action\" errors on the next redeploy."
  echo "  Generate one with: openssl rand -base64 32"
fi

# Unique per build so the client can detect it's talking to a stale server
# after a redeploy and force a hard reload instead of erroring.
NEXT_DEPLOYMENT_ID="$(git rev-parse --short HEAD 2>/dev/null || date +%s)"

docker build --no-cache \
  --build-arg NEXT_PUBLIC_APP_URL="$(get_var NEXT_PUBLIC_APP_URL)" \
  --build-arg NEXT_PUBLIC_BETTER_AUTH_URL="$(get_var NEXT_PUBLIC_BETTER_AUTH_URL)" \
  --build-arg NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID="$(get_var NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID)" \
  --build-arg NEXT_PUBLIC_LIVEKIT_URL="$(get_var NEXT_PUBLIC_LIVEKIT_URL)" \
  --build-arg NEXT_PUBLIC_LIVEKIT_AGENT_URL="$(get_var NEXT_PUBLIC_LIVEKIT_AGENT_URL)" \
  --build-arg NEXT_PUBLIC_VAPI_PUBLIC_KEY="$(get_var NEXT_PUBLIC_VAPI_PUBLIC_KEY)" \
  --build-arg NEXT_PUBLIC_VAPI_AGENT_ID="$(get_var NEXT_PUBLIC_VAPI_AGENT_ID)" \
  --build-arg NEXT_PUBLIC_FILENEST_PROJECT_ID="$(get_var NEXT_PUBLIC_FILENEST_PROJECT_ID)" \
  --build-arg NEXT_PUBLIC_FILENEST_API_URL="$(get_var NEXT_PUBLIC_FILENEST_API_URL)" \
  --build-arg NEXT_DEPLOYMENT_ID="$NEXT_DEPLOYMENT_ID" \
  --secret id=next_server_actions_key,env=NEXT_SERVER_ACTIONS_ENCRYPTION_KEY \
  -t "$IMAGE_TAG" \
  .

echo ""
echo "Build complete: $IMAGE_TAG"
echo ""
echo "Run with:"
echo "  docker run --env-file $ENV_FILE -p 3000:3000 $IMAGE_TAG"
