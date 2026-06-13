/**
 * TerminologySelect — shared FHIR terminology-backed combobox.
 *
 * Layer: client / shared / components
 *
 * A controlled combobox that sources its options from the FHIR terminology
 * server. Works as a drop-in React Hook Form <Controller> render prop.
 *
 * ── Fetch modes ──────────────────────────────────────────────────────────────
 *
 *  Client mode (default, serverSearch=false):
 *    Loads the full value set bound to `resource + field` once on mount via
 *    getConceptsForFieldAction. Filtering is done in the browser. Best for
 *    small, stable enumerations (gender: 4 items, status: 5 items).
 *
 *  Server field search (serverSearch=true, no searchSystem):
 *    Re-fires getConceptsForFieldAction with the user's query on every debounce
 *    tick. The server filters the value set. Good for larger field value sets.
 *
 *  Server system search (serverSearch=true, searchSystem provided):
 *    Uses searchTerminologyAction scoped to the given canonical system URL.
 *    Appropriate for open terminologies: SNOMED CT, LOINC, ICD-10, RxNorm.
 *
 * ── Value types ───────────────────────────────────────────────────────────────
 *
 *  "code" (default):
 *    onChange emits a plain string code, e.g. "male".
 *    Suitable for simple enum fields stored as a scalar on the FHIR resource.
 *
 *  "codeable_concept":
 *    onChange emits { code, system, display, text }.
 *    Suitable for CodeableConcept fields (Condition.code, Observation.code…)
 *    where the system URL and display term must be persisted alongside the code.
 *
 * @example
 * // Simple enum — gender on patient profile
 * <TerminologySelect resource="Patient" field="gender"
 *   value={field.value} onChange={field.onChange} />
 *
 * @example
 * // Large open terminology — SNOMED diagnosis with server search
 * <TerminologySelect
 *   resource="Condition" field="code"
 *   valueType="codeable_concept"
 *   serverSearch searchSystem={TERMINOLOGY_SYSTEMS.SNOMED_CT}
 *   value={field.value} onChange={field.onChange} />
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  getConceptsForFieldAction,
  searchTerminologyAction,
} from "@/modules/server/presentation/actions/terminology/terminology.actions";
import type {
  TConceptResponse,
  TTerminologySystem,
} from "@/modules/entities/schemas/terminology/terminology.schema";

// ── Public types ───────────────────────────────────────────────────────────────

/**
 * Structured value emitted when `valueType="codeable_concept"`.
 * Maps directly to FHIR CodeableConcept.coding[0].
 */
export interface TCodeableConcept {
  /** Code from the system, e.g. "73211009". */
  code: string;
  /** Canonical system URL, e.g. "http://snomed.info/sct". */
  system: string;
  /** Human-readable display term. */
  display: string;
  /** Free-text representation (defaults to display). */
  text?: string;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface TerminologySelectProps {
  // ── Value set identification ─────────────────────────────────────────────────
  /** FHIR resource type, e.g. "Patient", "Condition". */
  resource: string;
  /** FHIR field name, e.g. "gender", "clinicalStatus". */
  field: string;

  // ── Initial load params ──────────────────────────────────────────────────────
  /** Pre-filter query applied on the initial client-mode load. */
  initialQ?: string;
  /** Max concepts to load / return per request. Default: 200. */
  limit?: number;
  /** Pagination offset. Default: 0. */
  offset?: number;

  // ── Server search (opt-in) ───────────────────────────────────────────────────
  /**
   * Enable server-side search. When false (default) all concepts are loaded
   * on mount and filtered in the browser.
   */
  serverSearch?: boolean;
  /**
   * Canonical code system URL to scope the search (e.g. TERMINOLOGY_SYSTEMS.SNOMED_CT).
   * When set, uses searchTerminologyAction instead of getConceptsForFieldAction.
   * Leave unset to search within the field's bound value set.
   */
  searchSystem?: string | TTerminologySystem;
  /** Minimum characters before a server search fires. Default: 2. */
  minChars?: number;
  /** Debounce delay in ms for server search input. Default: 300. */
  debounceMs?: number;

  // ── Value ────────────────────────────────────────────────────────────────────
  /**
   * "code" (default): onChange emits a plain string code.
   * "codeable_concept": onChange emits { code, system, display, text }.
   */
  valueType?: "code" | "codeable_concept";
  /** Current controlled value. */
  value?: string | TCodeableConcept | null;
  /** Called with the new value when the user selects a concept, or null on clear. */
  onChange?: (value: string | TCodeableConcept | null) => void;

  // ── UI ───────────────────────────────────────────────────────────────────────
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ── Query key helpers ──────────────────────────────────────────────────────────

const CONCEPTS_KEY = (
  resource: string,
  field: string,
  q: string | undefined,
  limit: number,
  offset: number,
) => ["terminology", "conceptsForField", resource, field, q, limit, offset] as const;

const SEARCH_KEY = (
  q: string,
  system: string | undefined,
  limit: number,
  offset: number,
) => ["terminology", "search", q, system, limit, offset] as const;

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Shared FHIR terminology combobox for React Hook Form fields.
 *
 * @param props - See TerminologySelectProps for full documentation.
 */
export function TerminologySelect({
  resource,
  field,
  initialQ,
  limit = 200,
  offset = 0,
  serverSearch = false,
  searchSystem,
  minChars = 2,
  debounceMs = 300,
  valueType = "code",
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  className,
}: TerminologySelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>();

  // ── Derived flags ────────────────────────────────────────────────────────────

  const isServerSystemMode = serverSearch && !!searchSystem;
  const isServerFieldMode = serverSearch && !searchSystem;
  const isClientMode = !serverSearch;

  const effectiveMinChars = serverSearch ? minChars : 0;

  // ── Debounce input → debouncedQ ──────────────────────────────────────────────

  useEffect(() => {
    if (!serverSearch) return;
    const id = setTimeout(() => setDebouncedQ(inputValue), debounceMs);
    return () => clearTimeout(id);
  }, [inputValue, debounceMs, serverSearch]);

  // ── Sync trigger width for popover ───────────────────────────────────────────

  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  // ── Concepts query (client mode + server field search) ───────────────────────

  /**
   * Used for:
   *  - Client mode: load all concepts once (enabled always).
   *  - Server field search: refetch with debounced query (enabled when minChars met).
   */
  const conceptsQuery = useQuery({
    queryKey: CONCEPTS_KEY(
      resource,
      field,
      isClientMode ? initialQ : debouncedQ || undefined,
      limit,
      offset,
    ),
    queryFn: async () => {
      const [data, err] = await getConceptsForFieldAction({
        payload: {
          resource,
          field,
          q: isClientMode ? initialQ : (debouncedQ || undefined),
          limit,
          offset,
        },
      });
      if (err) throw new Error(err.message ?? "Failed to load concepts");
      return data!;
    },
    staleTime: 10 * 60 * 1000,
    // Client mode: always enabled. Server field mode: only when enough chars typed.
    enabled: !isServerSystemMode && (isClientMode || debouncedQ.length >= effectiveMinChars),
  });

  // ── System search query (server system mode only) ─────────────────────────────

  const systemSearchQuery = useQuery({
    queryKey: SEARCH_KEY(debouncedQ, searchSystem as string | undefined, limit, offset),
    queryFn: async () => {
      const [data, err] = await searchTerminologyAction({
        payload: {
          q: debouncedQ,
          system: searchSystem as TTerminologySystem | undefined,
          limit,
          offset,
        },
      });
      if (err) throw new Error(err.message ?? "Failed to search terminology");
      return data!;
    },
    staleTime: 30_000,
    enabled: isServerSystemMode && debouncedQ.length >= effectiveMinChars,
  });

  // ── Resolved concept list ─────────────────────────────────────────────────────

  const allConcepts: TConceptResponse[] = useMemo(() => {
    if (isServerSystemMode) return systemSearchQuery.data?.concepts ?? [];
    return conceptsQuery.data?.concepts ?? [];
  }, [isServerSystemMode, systemSearchQuery.data, conceptsQuery.data]);

  /**
   * Client-mode: filter the full list locally against the input.
   * Server modes: the server already applied the filter — use as-is.
   */
  const displayConcepts: TConceptResponse[] = useMemo(() => {
    if (serverSearch) return allConcepts;
    if (!inputValue.trim()) return allConcepts;
    const q = inputValue.toLowerCase();
    return allConcepts.filter(
      (c) =>
        c.display?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        (c.definition?.toLowerCase().includes(q) ?? false),
    );
  }, [serverSearch, allConcepts, inputValue]);

  const isLoading =
    conceptsQuery.isFetching || systemSearchQuery.isFetching;

  // ── Selected concept display label ────────────────────────────────────────────

  /**
   * Resolves the human-readable label for the currently selected value.
   * Falls back to the raw code/system string when the concept list hasn't loaded yet.
   */
  const selectedLabel: string | null = useMemo(() => {
    if (!value) return null;
    if (typeof value === "object") return value.display;
    // Plain code — look up display from the loaded list
    return allConcepts.find((c) => c.code === value)?.display ?? value;
  }, [value, allConcepts]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  /** Emit the appropriate value shape and close the popover. */
  function handleSelect(concept: TConceptResponse) {
    if (valueType === "codeable_concept") {
      onChange?.({
        code: concept.code,
        system: concept.system ?? "",
        display: concept.display,
        text: concept.display,
      });
    } else {
      onChange?.(concept.code);
    }
    setOpen(false);
    setInputValue("");
    setDebouncedQ("");
  }

  /** Clear the current selection. */
  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange?.(null);
  }

  // ── Empty state message ───────────────────────────────────────────────────────

  const emptyMessage = isLoading
    ? "Loading…"
    : serverSearch && inputValue.length < effectiveMinChars
      ? `Type at least ${effectiveMinChars} character${effectiveMinChars !== 1 ? "s" : ""} to search`
      : "No results found.";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-9",
            !selectedLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selectedLabel ?? placeholder}
          </span>
          <span className="flex items-center gap-1 ml-2 shrink-0">
            {/* Clear button — only shown when a value is selected */}
            {value && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
                className="rounded-sm opacity-60 hover:opacity-100 hover:bg-accent p-0.5"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: triggerWidth ?? "100%" }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {displayConcepts.map((concept) => {
                const isSelected =
                  typeof value === "object"
                    ? value?.code === concept.code
                    : value === concept.code;

                return (
                  <CommandItem
                    key={`${concept.system ?? ""}:${concept.code}`}
                    value={concept.code}
                    onSelect={() => handleSelect(concept)}
                    className="flex items-start gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{concept.display}</div>
                      {concept.definition && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {concept.definition}
                        </div>
                      )}
                      {/* Show code + system for codeable concept mode */}
                      {valueType === "codeable_concept" && concept.system_name && (
                        <div className="text-xs text-muted-foreground/70 mt-0.5 font-mono">
                          {concept.code} · {concept.system_name}
                        </div>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
