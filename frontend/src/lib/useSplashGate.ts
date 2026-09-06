import { useEffect, useState } from 'react';

// Keeps the splash screen visible for at least `minMs`, even if the real loading
// condition resolves sooner, so the entrance animation always plays to completion.
export function useSplashGate(loading: boolean, minMs = 1900) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), minMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return loading || !minTimeElapsed;
}
