/**
 * PatientAppointmentsTable — client-side appointments list for the patient portal.
 *
 * Layer: client / telemedicine / patient / appointments / list
 *
 * Renders the patient's own appointment history and upcoming appointments using
 * the shared TanStack Table v8 system. Server-side pagination with client-side
 * status/doctor filters (volumes are low per patient so filtering in-page is fine).
 *
 * Mutation flow:
 *  - Cancel: updateAppointmentAction({ id, status: "cancelled" })
 *  - Delete: deleteAppointmentAction({ id })
 * Both mutations are confirmed via an AlertDialog before executing, and
 * invalidate the query cache on success.
 *
 * Pattern source: OrganizationsTable.tsx (useServerDataTable + useQuery + two-state seeding).
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DataTable,
  DataTableToolbar,
  useServerDataTable,
} from "@/modules/client/shared/components/tables";
import { type TAppointmentResponse, type TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";
import { updateAppointmentAction, deleteAppointmentAction } from "@/modules/server/presentation/actions/appointment";
import {
  patientAppointmentKeys,
  fetchMyAppointments,
} from "./appointmentQueries";
import {
  createPatientAppointmentColumns,
} from "./PatientAppointmentColumns";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size for the patient appointment list. */
const INITIAL_PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Props accepted by PatientAppointmentsTable. */
interface PatientAppointmentsTableProps {
  /**
   * SSR-fetched first page — seeds the table immediately to avoid a
   * loading flash on navigation. Subsequent pages are fetched client-side.
   */
  initialData: TPaginatedAppointmentResponse;
  /** Book appointment route prefix, built server-side from the active locale. */
  bookHref: string;
}

// ── Dialog state ──────────────────────────────────────────────────────────────

/** Tracks which row triggered which confirmation dialog. */
type DialogState =
  | { type: "cancel"; row: TAppointmentResponse }
  | { type: "delete"; row: TAppointmentResponse }
  | null;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client-side patient appointments table.
 *
 * Accepts an SSR-seeded initial page and re-fetches on pagination changes.
 * Cancel and delete actions show a confirmation AlertDialog before executing.
 *
 * @param initialData - First-page data fetched on the server.
 * @param bookHref - Localised href for the "Book Appointment" link button.
 */
export function PatientAppointmentsTable({
  initialData,
  bookHref,
}: PatientAppointmentsTableProps) {
  const queryClient = useQueryClient();

  // ── Row + page count state (seeded from SSR, synced from client query) ──────
  const [rows, setRows] = useState<TAppointmentResponse[]>(initialData.data ?? []);
  const [pageCount, setPageCount] = useState(
    Math.ceil((initialData.total ?? 0) / INITIAL_PAGE_SIZE),
  );

  // ── Dialog state ─────────────────────────────────────────────────────────────
  const [dialog, setDialog] = useState<DialogState>(null);

  // ── Column definitions (memo-stable) ────────────────────────────────────────
  const columns = useMemo(
    () =>
      createPatientAppointmentColumns({
        onCancel: (row) => setDialog({ type: "cancel", row }),
        onDelete: (row) => setDialog({ type: "delete", row }),
      }),
    [],
  );

  // ── TanStack Table ───────────────────────────────────────────────────────────
  const { table, state } = useServerDataTable({
    columns,
    data: rows,
    pageCount,
    initialPageSize: INITIAL_PAGE_SIZE,
  });

  // ── Server query ─────────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: patientAppointmentKeys.list({
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
    }),
    queryFn: () =>
      fetchMyAppointments({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
      }),
    initialData,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  // Sync table rows whenever a new page arrives
  useEffect(() => {
    if (data) {
      setRows(data.data ?? []);
      setPageCount(
        Math.ceil((data.total ?? 0) / state.pagination.pageSize),
      );
    }
  }, [data, state.pagination.pageSize]);

  // ── Invalidate helper ────────────────────────────────────────────────────────
  /** Invalidates every patient appointment query entry after a mutation. */
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: patientAppointmentKeys.all });
  }, [queryClient]);

  // ── Cancel mutation ──────────────────────────────────────────────────────────
  const { mutate: cancelAppointment, isPending: isCancelling } = useMutation({
    mutationFn: async (id: number) => {
      const [, err] = await updateAppointmentAction({
        payload: { id, status: "cancelled" },
      });
      if (err) throw new Error(err.message ?? "Failed to cancel appointment");
    },
    onSuccess: () => {
      toast.success("Appointment cancelled");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setDialog(null),
  });

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const { mutate: deleteAppointment, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      const [, err] = await deleteAppointmentAction({ payload: { id } });
      if (err) throw new Error(err.message ?? "Failed to delete appointment");
    },
    onSuccess: () => {
      toast.success("Appointment deleted");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setDialog(null),
  });

  const isMutating = isCancelling || isDeleting;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Table + toolbar */}
      <DataTable table={table} loading={isFetching}>
        <DataTableToolbar table={table}>
          {/* Book appointment shortcut */}
          <Button asChild size="sm" className="ml-auto">
            <Link href={bookHref}>
              <CalendarPlus className="size-4 mr-1.5" />
              Book Appointment
            </Link>
          </Button>
        </DataTableToolbar>
      </DataTable>

      {/* Cancel confirmation dialog */}
      <AlertDialog
        open={dialog?.type === "cancel"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the appointment as cancelled. You can rebook at any
              time. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              Keep Appointment
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dialog?.type === "cancel" &&
                cancelAppointment(dialog.row.id)
              }
              disabled={isMutating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling…" : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={dialog?.type === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the appointment record. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dialog?.type === "delete" &&
                deleteAppointment(dialog.row.id)
              }
              disabled={isMutating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
