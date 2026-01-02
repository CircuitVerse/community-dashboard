"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // Clear any invalid theme values from localStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme && storedTheme.includes(' ')) {
        localStorage.removeItem('theme');
      }
    }
  }, []);

  // Ensure only valid theme values are passed
  const validProps = {
    ...props,
    defaultTheme: props.defaultTheme || "system",
  };
  
  return <NextThemesProvider {...validProps}>{children}</NextThemesProvider>;
}
