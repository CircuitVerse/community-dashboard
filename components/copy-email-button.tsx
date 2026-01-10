"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import Hint from "./hint";

const EMAIL = "support@circuitverse.org";

export default function CopyEmailButton() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      console.error("Clipboard API not available");
      return;
    }

    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 1500);
    } catch (error) {
      console.error("Failed to copy email:", error);
    }
  };

  return (
    <div className="relative">
      <Hint label="Email">  
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Email"
          className="text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-2 rounded-full transition-all duration-200"
        >
          <Image
            src="/gmail.svg"
            alt="Email"
            width={20}
            height={20}
            className="w-5 h-5"
          />
        </button>
      </Hint>

      {copied && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-50">
          <div className="relative">
            <div className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white
                            dark:bg-zinc-100 dark:text-zinc-900 shadow-md">
              Email Copied!
            </div>
            <span
              className="absolute left-1/2 top-full -translate-x-1/2
                         h-2 w-2 rotate-45
                         bg-zinc-900 dark:bg-zinc-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
