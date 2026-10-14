import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns true once the component has mounted in the browser.
 * Uses useSyncExternalStore to ensure SSR and initial client hydration
 * render identically without causing hydration mismatch warnings.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
