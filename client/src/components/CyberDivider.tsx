import { useEffect, useRef, useState } from "react";

/**
 * CyberDivider — animated "charge-up" horizontal rule.
 * The line scales from center outward and glows when it enters the viewport.
 */
export const CyberDivider = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [ignited, setIgnited] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIgnited(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="cyber-divider-container">
      <div className={`cyber-divider-line${ignited ? " ignite" : ""}`} />
    </div>
  );
};

export default CyberDivider;
