import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  formatter?: (n: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Smoothly animates from 0 → value on mount using requestAnimationFrame.
 * Respects `prefers-reduced-motion` — renders the final value instantly.
 */
export function AnimatedCounter({
  value,
  formatter = (n) => n.toLocaleString(),
  duration = 800,
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState("0");
  const prevValue = useRef(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(formatter(value));
      prevValue.current = value;
      return;
    }

    const from = prevValue.current;
    const to = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplay(formatter(current));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setDisplay(formatter(to));
        prevValue.current = to;
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [value, duration, formatter]);

  return <span className={className}>{display}</span>;
}
