import type { PushPermission } from '@/features/notifications/lib/expoPush';

/** Owner-approved wording, shown on our own sheet before the operating system prompt (issue #47). */
export const PERMISSION_EXPLANATION =
  'Coreo can send one nudge at 9 PM: twenty seconds to say how today felt. Nothing else.';

type PromptInput = {
  /** `check_in_style` from the wellness profile; the server sends the 9 PM nudge only for `step_in`. */
  checkInStyle: string | undefined;
  permission: PushPermission | null;
  /** The person said no on our sheet earlier: do not ask again unprompted. */
  declined: boolean;
};

/**
 * Ask only when the nudge applies to this person, the system has not been asked yet (a refused
 * system prompt cannot be asked again, and an allowed one needs no question), and the person has
 * not already said no here.
 */
export function shouldShowPermissionPrompt({
  checkInStyle,
  permission,
  declined,
}: PromptInput): boolean {
  return checkInStyle === 'step_in' && permission === 'undetermined' && !declined;
}
