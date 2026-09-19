/**
 * draftStatus — decides whether a form item or the SOAP note still matches
 * what was last confirmed to the EMR.
 *
 * Layer: client / telemedicine / doctor / component / appointment-review
 *
 * An encounter that was already confirmed once can still be edited afterward
 * (a new item added, an existing item's fields changed, the SOAP note
 * reworded). Those edits live only in the autosaved draft until "Confirm &
 * Save" runs again. This module is the single place that decides, per item,
 * whether it's identical to the published snapshot ("in EMR") or not
 * ("draft — not yet pushed").
 */

import type { SoapNote } from "./types";

/** Minimal shape every *FormItem satisfies — enough to compare and to key by. */
interface BaseFormItem {
  id: string;
  fhirId?: number;
}

/** Strips the local-only `id` key so two items can be compared by content alone. */
function withoutLocalId<T extends BaseFormItem>(item: T): Omit<T, "id"> {
  const { id, ...rest } = item;
  void id;
  return rest;
}

/**
 * @param item - Current form item (possibly edited, possibly brand new).
 * @param published - Form items rehydrated from the last-confirmed FHIR records.
 * @returns "draft" if `item` has no fhirId yet, or its fields differ from the
 *   matching published item; "synced" if it's identical to what's in the EMR.
 */
export function formItemSyncStatus<T extends BaseFormItem>(
  item: T,
  published: T[],
): "synced" | "draft" {
  if (!item.fhirId) return "draft";
  const match = published.find((p) => p.fhirId === item.fhirId);
  if (!match) return "draft";
  return JSON.stringify(withoutLocalId(item)) === JSON.stringify(withoutLocalId(match))
    ? "synced"
    : "draft";
}

/**
 * @param soap - Current SOAP note state.
 * @param publishedSoap - The note as it stood after the last Confirm & Save,
 *   or null if this encounter has never been confirmed.
 * @returns true if the note has no changes since the last confirm.
 */
export function isSoapSynced(soap: SoapNote, publishedSoap: SoapNote | null): boolean {
  if (!publishedSoap) return false;
  return JSON.stringify(soap) === JSON.stringify(publishedSoap);
}
