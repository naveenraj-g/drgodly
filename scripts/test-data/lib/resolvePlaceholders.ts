/**
 * Placeholder resolution for scenario fixtures.
 *
 * Two kinds of `{{...}}` tokens appear in scenario JSON:
 *  - Context lookups: `{{PATIENT_REF}}`, `{{ENCOUNTER_ID}}`,
 *    `{{SERVICE_REQUEST_REF:lab-cbc}}` — resolved from the `context` map built up
 *    as the seed script creates each resource. The whole `{{...}}` interior is
 *    used as the lookup key verbatim (including any ":name" suffix), so adding a
 *    new named reference kind never requires touching this file.
 *  - Dynamic tokens: `{{NOW}}`, `{{DAYS_AGO:5}}`, `{{DAYS_AGO:5:09:15}}` — computed
 *    from the current time so fixtures never go stale with a baked-in date.
 *
 * A match must be the *entire* string value (never embedded in a larger string),
 * so a placeholder can resolve to a number (e.g. encounter_id) without stringifying it.
 */

export type PlaceholderContext = Record<string, string | number>;

const TOKEN = /^\{\{(.+)\}\}$/;

function resolveDynamic(key: string): string | undefined {
  if (key === "NOW") return new Date().toISOString();

  const daysAgo = key.match(/^DAYS_AGO:(\d+)$/);
  if (daysAgo) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - Number(daysAgo[1]));
    return d.toISOString();
  }

  const daysAgoAt = key.match(/^DAYS_AGO:(\d+):(\d{2}):(\d{2})$/);
  if (daysAgoAt) {
    const [, days, hh, mm] = daysAgoAt;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - Number(days));
    d.setUTCHours(Number(hh), Number(mm), 0, 0);
    return d.toISOString();
  }

  return undefined;
}

/** Recursively resolves every `{{...}}` token in `value` against `context`. */
export function resolvePlaceholders<T>(value: T, context: PlaceholderContext): T {
  if (typeof value === "string") {
    const match = value.match(TOKEN);
    if (!match) return value;

    const key = match[1];
    const dynamic = resolveDynamic(key);
    if (dynamic !== undefined) return dynamic as unknown as T;

    if (!(key in context)) {
      throw new Error(
        `Unresolved placeholder {{${key}}} — no value bound for it yet. Check the resource ` +
          `creation order in seed.ts, or that a "name" matches this token's reference.`,
      );
    }
    return context[key] as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((v) => resolvePlaceholders(v, context)) as unknown as T;
  }

  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolvePlaceholders(v, context);
    }
    return out as T;
  }

  return value;
}
