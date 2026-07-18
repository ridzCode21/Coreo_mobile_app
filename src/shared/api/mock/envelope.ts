/**
 * Helpers matching the two response envelope styles in API_REFERENCE.md §2. Mock handlers use
 * these instead of hand-rolling the shape so mock and (eventual) live responses stay identical.
 */

export type StyleAOk<T> = { success: true; data: T; message?: string };
export type StyleAErr = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

/** Style A — wrapped envelope (users + core apps). */
export function styleAOk<T>(data: T, message?: string): StyleAOk<T> {
  return message !== undefined ? { success: true, data, message } : { success: true, data };
}

export function styleAError(code: string, message: string, details?: unknown): StyleAErr {
  return details !== undefined
    ? { success: false, error: { code, message, details } }
    : { success: false, error: { code, message } };
}

/** Style B — bare payload (food/exercise/insights/meals apps). Just returns `data` as-is; this
 * helper exists so call sites are self-documenting about which style a route uses. */
export function styleB<T>(data: T): T {
  return data;
}

/** Bare DRF-style field error, e.g. `{ "water_ml": ["A valid integer is required."] }`. */
export function fieldError(fields: Record<string, string[]>): Record<string, string[]> {
  return fields;
}
