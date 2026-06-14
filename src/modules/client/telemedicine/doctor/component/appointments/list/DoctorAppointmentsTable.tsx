/**
 * DoctorAppointmentsTable — client-side appointments list for the doctor portal.
 *
 * Layer: client / telemedicine / doctor / appointments / list
 *
 * Renders the org-scoped appointment list for a practitioner using the shared
 * TanStack Table v8 system. Server-side pagination, client-side status/patient
 * filters.
 *
 * Mutation flow:
 *  - Confirm: updateAppointmentAction({ id, status: "booked" })  — pending → booked
 *  - Cancel:  updateAppointmentAction({ id, status: "cancelled" })
 *  - Delete:  deleteAppointmentAction({ id })
 * All mutations require confirmation via AlertDialog and invalidate the cache on
 * success.
 *
 * Pattern source: OrganizationsTable.tsx (useServerDataTable + useQuery + two-state seeding).
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  type TAppointmentResponse,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";
import {
  updateAppointmentAction,
  deleteAppointmentAction,
} from "@/modules/server/presentation/actions/appointment";
import {
  doctorAppointmentKeys,
  fetchDoctorAppointments,
} from "./appointmentQueries";
import { createDoctorAppointmentColumns } from "./DoctorAppointmentColumns";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default page size for the doctor appointment list. */
const INITIAL_PAGE_SIZE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Props accepted by DoctorAppointmentsTable. */
interface DoctorAppointmentsTableProps {
  /**
   * SSR-fetched first page — seeds the table immediately to avoid a
   * loading flash on navigation. Subsequent pages are fetched client-side.
   */
  initialData: TPaginatedAppointmentResponse;
  /** Active organisation ID from the server session, used to scope the list query. */
  orgId: string | null;
}

// ── Dialog state ──────────────────────────────────────────────────────────────

/** Tracks which row triggered which confirmation dialog. */
type DialogState =
  | { type: "confirm"; row: TAppointmentResponse }
  | { type: "cancel"; row: TAppointmentResponse }
  | { type: "delete"; row: TAppointmentResponse }
  | null;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Client-side doctor appointments table.
 *
 * Accepts an SSR-seeded initial page and re-fetches on pagination changes.
 * Confirm, cancel, and delete actions each show a confirmation AlertDialog.
 *
 * @param initialData - First-page data fetched on the server.
 * @param orgId - Active organisation ID for scoping the list query.
 */
export function DoctorAppointmentsTable({
  initialData,
  orgId,
}: DoctorAppointmentsTableProps) {
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
      createDoctorAppointmentColumns({
        onConfirm: (row) => setDialog({ type: "confirm", row }),
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
    queryKey: doctorAppointmentKeys.list({
      pageIndex: state.pagination.pageIndex,
      pageSize: state.pagination.pageSize,
      orgId,
    }),
    queryFn: () =>
      fetchDoctorAppointments({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
        orgId,
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
  /** Invalidates every doctor appointment query entry after a mutation. */
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: doctorAppointmentKeys.all });
  }, [queryClient]);

  // ── Confirm mutation (pending → booked) ──────────────────────────────────────
  const { mutate: confirmAppointment, isPending: isConfirming } = useMutation({
    mutationFn: async (id: number) => {
      const [, err] = await updateAppointmentAction({
        payload: { id, status: "booked" },
      });
      if (err) throw new Error(err.message ?? "Failed to confirm appointment");
    },
    onSuccess: () => {
      toast.success("Appointment confirmed");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setDialog(null),
  });

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

  const isMutating = isConfirming || isCancelling || isDeleting;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Table + toolbar */}
      <DataTable table={table} loading={isFetching}>
        <DataTableToolbar table={table} />
      </DataTable>

      {/* Confirm appointment dialog */}
      <AlertDialog
        open={dialog?.type === "confirm"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the appointment from{" "}
              <strong>Pending</strong> to <strong>Booked</strong>. The patient
              will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              Not yet
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dialog?.type === "confirm" &&
                confirmAppointment(dialog.row.id)
              }
              disabled={isMutating}
            >
              {isConfirming ? "Confirming…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirmation dialog */}
      <AlertDialog
        open={dialog?.type === "cancel"}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the appointment as cancelled. This action cannot be
              undone.
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
