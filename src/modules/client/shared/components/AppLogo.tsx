/**
 * AppLogo — the DrGodly brand mark.
 *
 * Layer: client / shared / components
 *
 * Renders public/logo.png (the same square "DG" mark used for the browser
 * favicon at src/app/icon.png, copied into public/ since the favicon file
 * convention's route is for metadata generation only, not a general-purpose
 * asset URL). The image already carries its own background — render it
 * bare, don't wrap it in another colored badge.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

export function AppLogo({
  size = 32,
  className,
}: {
  /** Width/height in px. Default 32 (matches the main app sidebar's size-8 badge). */
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="DrGodly"
      width={size}
      height={size}
      className={cn("rounded-lg", className)}
    />
  );
}
