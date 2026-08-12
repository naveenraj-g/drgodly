/**
 * SummaryTab — appointment context and the encounters the visit produced.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records / tabs
 *
 * Visit metadata only. The clinical note lives on its own tab as a document
 * canvas, so this stays a compact reference the doctor can glance at.
 *
 * An appointment normally yields exactly one Encounter, but Encounter.appointment[]
 * is a many-to-many link in FHIR, so all of them are listed rather than assuming
 * a single row.
 */

"use client";

import { CalendarDays, Clock, Layers, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { TAppointmentResponse } from "@/modules/entities/schemas/appointment";
import type { TEncounterResponse } from "@/modules/entities/schemas/encounter";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formats an ISO datetime as a locale date + time, e.g. "5 Jan 2026, 10:30 AM".
 *
 * @param iso - ISO 8601 string.
 * @returns Formatted string, or an em dash when absent/unparseable.
 */
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SummaryTabProps {
  /** The appointment this workspace is scoped to. */
  appointment: TAppointmentResponse;
  /** Every Encounter linked to that appointment. */
  encounters: TEncounterResponse[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * One labelled key/value row in the appointment detail grid.
 *
 * @param label - Field label.
 * @param value - Field value; the row is omitted by the caller when empty.
 */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the visit's appointment and encounter context.
 *
 * @param appointment - Appointment being documented.
 * @param encounters - Encounters produced by the appointment.
 */
export function SummaryTab({ appointment, encounters }: SummaryTabProps) {
  const apptType =
    appointment.appointment_type_display ??
    appointment.appointment_type_text ??
    null;

  return (
    <div className="space-y-5">
      {/* ── Appointment details ── */}
      <Card>
        <CardContent className="px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <p className="text-sm font-semibold">Appointment</p>
            <Badge variant="outline" className="text-[10px] font-mono font-normal">
              Appointment/{appointment.id}
            </Badge>
            <Badge variant="secondary" className="ml-auto text-xs capitalize font-normal">
              {appointment.status ?? "unknown"}
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
            <DetailRow label="Start" value={fmtDateTime(appointment.start)} />
            <DetailRow label="End" value={fmtDateTime(appointment.end)} />
            {appointment.minutes_duration != null && (
              <DetailRow
                label="Duration"
                value={`${appointment.minutes_duration} min`}
              />
            )}
            {apptType && <DetailRow label="Type" value={apptType} />}
            {appointment.description && (
              <DetailRow label="Description" value={appointment.description} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Encounters ── */}
      <Card>
        <CardContent className="px-4 py-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <p className="text-sm font-semibold">Encounters</p>
            <Badge variant="secondary" className="text-xs font-normal">
              {encounters.length}
            </Badge>
          </div>

          <Separator />

          {encounters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No encounter recorded for this appointment.
            </p>
          ) : (
            <div className="space-y-2.5">
              {encounters.map((enc) => {
                /* class[] carries the care setting (virtual, ambulatory, …). */
                const careSetting =
                  enc.class?.[0]?.coding_display ?? enc.class?.[0]?.coding_code ?? null;
                const encType =
                  enc.type?.[0]?.coding_display ?? enc.type?.[0]?.text ?? null;

                return (
                  <div
                    key={enc.id}
                    className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-1.5"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono font-normal"
                      >
                        Encounter/{enc.id}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize font-normal"
                      >
                        {enc.status ?? "unknown"}
                      </Badge>
                      {careSetting && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Stethoscope className="size-3" />
                          {careSetting}
                        </span>
                      )}
                      {encType && (
                        <span className="text-xs text-muted-foreground">
                          {encType}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3 shrink-0" />
                      {fmtDateTime(enc.actual_period_start)}
                      {enc.actual_period_end
                        ? ` – ${fmtDateTime(enc.actual_period_end)}`
                        : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
