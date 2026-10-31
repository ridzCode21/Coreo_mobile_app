/**
 * The one place caught errors go (docs/architecture.md §7, docs/coding-standards.md §6). Only the
 * message is kept — never the error object, which can carry a response body, a token or a health
 * value. When Sentry lands (CLAUDE.md §7) this is the one file that changes.
 */
export function reportError(error: unknown, context: string): void {
  if (!__DEV__) return;
  const message = error instanceof Error ? error.message : 'unknown error';
  console.warn(`[${context}] ${message}`);
}
