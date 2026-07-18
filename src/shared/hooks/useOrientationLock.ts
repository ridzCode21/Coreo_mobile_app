import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * Declares a screen's orientation policy explicitly — docs/design-system.md §11.3/§11.4 requires
 * every screen state this rather than leave it implicit. Locks while the screen is mounted,
 * restores unrestricted rotation on unmount so screens elsewhere in the stack aren't affected.
 * No-ops (via the caught rejection) on platforms/targets that don't support locking, e.g. web.
 */
export function useOrientationLock(lock: 'portrait' | null): void {
  useEffect(() => {
    if (!lock) return;

    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, [lock]);
}
