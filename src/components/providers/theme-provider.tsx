"use client"

import type { ThemeProviderProps } from "next-themes"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * next-themes writes a tiny blocking script into <head> that applies the saved
 * theme before first paint. It needs to stay a real, executable <script>: an
 * earlier version of this file set `type="application/json"` on the server to
 * silence a React 19 warning, which would have stopped the script from running
 * and caused a light-mode flash on every dark-mode visit. Do not reintroduce it.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
