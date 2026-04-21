import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Displays an indicator when the user is offline
 * Shows a toast-style notification at the top of the screen
 * Suppressed on marketing pages (home, pricing, municipal) to avoid implying downtime
 */
export function OfflineIndicator({ isAuthenticatedRoute = true }: { isAuthenticatedRoute?: boolean }) {
  const isOnline = useOnlineStatus();

  // Don't show on marketing pages or when online
  if (!isAuthenticatedRoute || isOnline) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 bg-yellow-500 text-yellow-950">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">You're offline - viewing cached data</span>
    </div>
  );
}
