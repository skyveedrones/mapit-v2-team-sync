/**
 * LazyMapWrapper — Renders the map immediately on mount.
 *
 * Previously used IntersectionObserver to defer rendering, but this caused
 * a blank map on first project open because the observer fired before the
 * project data loaded (so the container had 0 dimensions or wasn't yet in DOM).
 *
 * Now renders children immediately. The MapboxProjectMap component itself
 * handles resize via ResizeObserver and requestAnimationFrame.
 */
import { type ReactNode } from "react";

interface LazyMapWrapperProps {
  children: ReactNode;
  /** Height of the map container */
  height?: string;
  /** Kept for API compatibility — no longer used */
  rootMargin?: string;
}

export function LazyMapWrapper({
  children,
  height = "500px",
}: LazyMapWrapperProps) {
  return (
    <div style={{ minHeight: height }}>
      {children}
    </div>
  );
}
