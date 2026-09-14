/**
 * @file use-debounced-value.ts
 * @description React hook that returns a debounced echo of a rapidly-changing
 * value. Useful for deriving a server-fetch trigger (e.g. a TanStack Query key)
 * from a controlled text input without firing a request on every keystroke.
 * @layer shared/tables/hooks
 */

"use client";

import * as React from "react";

/**
 * Returns `value`, delayed — the returned value only updates once `delay`
 * milliseconds have passed without `value` changing again.
 *
 * @param value - The rapidly-changing source value (e.g. a controlled input's state).
 * @param delay - Debounce delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
