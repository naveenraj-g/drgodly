"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { capitalizeString } from "@/modules/shared/helper";
/**
 * True for a path segment that's a database id rather than a real route
 * name — either a pure-digit id of any length (e.g. "40019") or a longer
 * hex/uuid-style id. The old digit-length-6+ threshold let short numeric
 * ids like a 5-digit appointment id through unfiltered, adding a
 * meaningless crumb and extra width to the breadcrumb.
 */
const isProbablyId = (segment: string) =>
  /^\d+$/.test(segment) || /^[0-9a-fA-F-]{6,}$/.test(segment);

export default function BreadCrumb({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  const pathSegments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => !isProbablyId(s));

  if (pathSegments.length === 0) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {pathSegments.map((segment, index) => {
          const label = segment.split("-").join(" ").toLowerCase();
          const linkPath = pathSegments.slice(0, index + 1).join("/");
          const isLast = index + 1 === pathSegments.length;

          return isLast ? (
            <BreadcrumbItem key={segment}>
              <BreadcrumbPage
                className={cn("text-base text-primary font-bold")}
              >
                {capitalizeString(segment === "bezs" ? "Home" : label)}
              </BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <BreadcrumbList key={segment}>
              <BreadcrumbItem>
                <Link
                  href={`/${linkPath}`}
                  className="text-base hover:text-foreground"
                >
                  {segment === "bezs" ? "Home" : capitalizeString(label)}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="[&>svg]:size-4.5" />
            </BreadcrumbList>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
