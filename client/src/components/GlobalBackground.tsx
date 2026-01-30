/**
 * Global Background Component
 * Provides the dynamic aerial/grid background used throughout the site
 * Includes the hero drone image with overlay and grid pattern
 */

export function GlobalBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Background Image */}
      <img
        src="/images/hero-drone-aerial.jpg"
        alt=""
        className="w-full h-full object-cover opacity-20"
        aria-hidden="true"
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 grid-pattern" />
    </div>
  );
}

export default GlobalBackground;
