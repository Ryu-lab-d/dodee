'use client';

import { useEffect, useRef, useState } from 'react';

// Animates from 0 up to `value` on mount/when value changes. `format` renders the
// in-progress number (e.g. add a ฿ prefix or thousands separators).
export default function CountUp({
  value,
  durationMs = 700,
  format = (n: number) => n.toLocaleString(),
}: {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (value - from) * eased;
      setDisplay(current);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <>{format(Math.round(display))}</>;
}
