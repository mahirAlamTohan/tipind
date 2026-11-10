import { ErrorScreen } from "@/components/error-fallback"
import { siteContent } from "@/config/content"

/** Rendered for unknown paths; the static export writes this to 404.html. */
export default function NotFound() {
  return (
    <ErrorScreen
      description={siteContent.ui.notFoundDescription}
      title={siteContent.ui.notFoundTitle}
    />
  )
}
