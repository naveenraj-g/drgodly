/**
 * PractitionerCard — selectable card for a FHIR PractitionerRole in the booking wizard.
 *
 * Layer: client / telemedicine / patient / appointments / book
 *
 * Renders the practitioner's display name, specialty, qualification, and
 * availability status derived from the fhir-gql PractitionerRoleBooking response.
 * Clicking the card selects it; a checkmark appears when selected.
 */

"use client";

import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TPractitionerRoleBookingResponse } from "@/modules/entities/schemas/practitioner-role";

/** Props for PractitionerCard. */
interface PractitionerCardProps {
  /** The FHIR PractitionerRole (booking-enriched) to display. */
  role: TPractitionerRoleBookingResponse;
  /** Whether this card is the currently selected practitioner. */
  selected: boolean;
  /** Called when the user clicks the card. */
  onSelect: () => void;
}

/**
 * Derives a display name from the embedded practitioner_detail.
 * Falls back to practitioner_display if name sub-resource is absent.
 *
 * @param role - The PractitionerRoleBooking response object.
 * @returns A formatted full name string.
 */
export function getPractitionerName(
  role: TPractitionerRoleBookingResponse,
): string {
  const n = role.practitioner_detail?.name;
  if (!n) return role.practitioner_display ?? "Unknown Practitioner";
  const parts = [...(n.prefix ?? []), ...(n.given ?? []), n.family].filter(
    Boolean,
  );
  return (
    (parts.join(" ") || role.practitioner_display) ?? "Unknown Practitioner"
  );
}

/**
 * Derives the specialty display string from specialty or code arrays.
 *
 * @param role - The PractitionerRoleBooking response object.
 * @returns Specialty label or empty string.
 */
export function getPractitionerSpecialty(
  role: TPractitionerRoleBookingResponse,
): string {
  return (
    role.specialty?.[0]?.coding_display ??
    role.specialty?.[0]?.text ??
    role.code?.[0]?.coding_display ??
    ""
  );
}

/**
 * Returns the first letter(s) of the practitioner's name for the avatar fallback.
 *
 * @param name - Full display name.
 * @returns 1–2 uppercase characters.
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Selectable doctor card for Step 1 of the booking wizard.
 *
 * @param role - FHIR PractitionerRole (booking-enriched).
 * @param selected - Whether this card is currently selected.
 * @param onSelect - Selection callback.
 */
export function PractitionerCard({
  role,
  selected,
  onSelect,
}: PractitionerCardProps) {
  const name = getPractitionerName(role);
  const specialty = getPractitionerSpecialty(role);
  const photoUrl = role.practitioner_detail?.photo_url;
  const qualification =
    role.practitioner_detail?.qualifications?.[0]?.code_display ?? null;
  const isActive = role.active !== false;

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "relative p-4 cursor-pointer transition-all hover:shadow-md",
        selected
          ? "border-primary shadow-md bg-primary/5"
          : "hover:border-primary/50 border-border",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Avatar className="size-10 shrink-0">
          {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
          <AvatarFallback className="text-sm font-semibold">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        {/* Core info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold truncate">{name}</p>
            {selected && (
              <CheckCircle2 className="size-3.5 text-primary shrink-0" />
            )}
          </div>
          {specialty && (
            <p className="text-xs text-muted-foreground truncate">
              {specialty}
            </p>
          )}
          {qualification && (
            <p className="text-xs text-muted-foreground/70 truncate">
              {qualification}
            </p>
          )}
          {!isActive && (
            <Badge
              variant="secondary"
              className="mt-0.5 text-[10px] px-1.5 h-4"
            >
              Unavailable
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
