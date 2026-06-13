/**
 * admin.store — Zustand store for telemedicine admin modal state.
 *
 * Layer: client / telemedicine / admin / stores
 *
 * Central store that tracks which modal is currently open and the data it needs.
 * Any component (table column cells, empty states, buttons) can open a modal by
 * calling onOpen({ type, data }) — no prop drilling or local useState required.
 *
 * Pattern mirrors nextjs-iam's admin.store.ts.
 */

import { create } from "zustand";
import { TOrgResponse } from "@/modules/entities/schemas/organization";

// ── Modal type union ───────────────────────────────────────────────────────────

/** All modal identifiers for the telemedicine admin section. */
export type ModalType =
  | "createOrganization"
  | "editOrganization"
  | "deleteOrganization";

// ── Modal data payload ─────────────────────────────────────────────────────────

/**
 * Flat data bag passed to the store when a modal is opened.
 * Each modal reads only the fields it needs.
 */
export interface ModalData {
  /** Organization fields (edit / delete). */
  organizationId?: number;
  organizationName?: string;
  /** Full org record — used by edit modal to pre-populate the form. */
  organization?: TOrgResponse;
  /** Better Auth user ID of the current session — passed through to create/edit actions. */
  userId?: string;
  /** Better Auth active organization ID of the current session — scopes created resources to the tenant. */
  orgId?: string;
}

// ── Store interface ────────────────────────────────────────────────────────────

interface IAdminStore {
  type: ModalType | null;
  isOpen: boolean;
  data: ModalData | null;
  /** Opens a modal. Pass the type and any data the modal needs to render. */
  onOpen: (props: { type: ModalType; data?: ModalData }) => void;
  /** Closes the current modal and clears all data. */
  onClose: () => void;
}

// ── Store instance ─────────────────────────────────────────────────────────────

const _useAdminStore = create<IAdminStore>((set) => ({
  type: null,
  isOpen: false,
  data: null,

  onOpen: ({ type, data }) =>
    set({ isOpen: true, type, data: data ?? null }),

  onClose: () =>
    set({ type: null, isOpen: false, data: null }),
}));

/**
 * Hook — use inside React components.
 * @example const openModal = useAdminStore((s) => s.onOpen);
 */
export const useAdminStore = _useAdminStore;

/**
 * Direct store accessor — use outside React (e.g. in column definitions).
 * @example const openModal = adminStore((s) => s.onOpen);
 */
export const adminStore = _useAdminStore;
