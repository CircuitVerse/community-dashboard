import { useLayoutEffect, useRef } from "react";

interface UseScrollRestorationOptions {
  isActive: boolean;
}

export function useScrollRestoration({ isActive }: UseScrollRestorationOptions) {
  const savedScrollY = useRef<number>(0);
  const hasMounted = useRef(false);
  const prevIsActive = useRef(isActive);
  const skipNextAutoSave = useRef(false);

  useLayoutEffect(() => {
    const wasActive = prevIsActive.current;
    prevIsActive.current = isActive;

    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    // Save when list becomes inactive (active -> inactive)
    if (wasActive && !isActive) {
      if (skipNextAutoSave.current) {
        skipNextAutoSave.current = false;
        return;
      }

      const y = window.scrollY;
      // Avoid overwriting a previously captured non-zero position with 0
      // (e.g. when the click handler scrolls to top before state flips).
      if (y !== 0 || savedScrollY.current === 0) {
        savedScrollY.current = y;
      }
      return;
    }

    // Restore when list becomes active again (inactive -> active)
    if (!wasActive && isActive) {
      const y = savedScrollY.current;
      if (y === 0) return;

      // Ensure DOM is ready before restoring.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: y, behavior: "auto" });
        });
      });
    }
  }, [isActive]);

  return {
    saveScrollPosition: () => {
      skipNextAutoSave.current = true;
      savedScrollY.current = window.scrollY;
    }
  };
}
