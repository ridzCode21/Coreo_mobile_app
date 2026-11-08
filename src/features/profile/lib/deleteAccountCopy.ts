export type DeleteAccountStep =
  | { kind: 'warning' }
  | { kind: 'confirmEmail' }
  | { kind: 'deleting' }
  | { kind: 'failed' }
  | { kind: 'offline' }
  | { kind: 'deleted' };

export function matchesAccountEmail(typed: string, accountEmail: string): boolean {
  const normalizedTyped = typed.trim().toLowerCase();
  return normalizedTyped.length > 0 && normalizedTyped === accountEmail.trim().toLowerCase();
}
