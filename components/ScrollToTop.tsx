"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 300;

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  const rafIdRef = useRef<number | null>(null);
  const tickingRef = useRef(false);

  const toggleVisibility = useCallback(() => {
    const shouldBeVisible = window.scrollY > SCROLL_THRESHOLD;
    setIsVisible(shouldBeVisible);
    tickingRef.current = false;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        rafIdRef.current = requestAnimationFrame(toggleVisibility);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [toggleVisibility]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed md:bottom-8 bottom-4 right-8 z-50 h-12 w-12 rounded-full shadow-lg
            bg-emerald-600 hover:bg-emerald-700
            dark:bg-emerald-500 dark:hover:bg-emerald-600
            text-white flex items-center justify-center
            transition-all duration-500 ease-in-out
            hover:scale-110 active:scale-95 cursor-pointer
            ${
              isVisible
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-6 pointer-events-none"
            }`}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
