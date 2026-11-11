"use client"

import { WifiOff } from "lucide-react"
import { useSyncExternalStore } from "react"

import { siteContent } from "@/config/content"

function subscribe(listener: () => void) {
  window.addEventListener("online", listener)
  window.addEventListener("offline", listener)
  return () => {
    window.removeEventListener("online", listener)
    window.removeEventListener("offline", listener)
  }
}

export function OfflineStatus() {
  const isOffline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false
  )

  if (!isOffline) return null

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-3 bottom-4 z-70 mx-auto flex max-w-md items-start gap-2.5 rounded-xl border border-warning-300 bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-950 shadow-lg dark:border-warning-800 dark:bg-warning-950 dark:text-warning-100"
      role="status"
    >
      <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{siteContent.ui.offlineNotice}</span>
    </div>
  )
}
