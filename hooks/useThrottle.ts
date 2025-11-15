import { useRef } from "react";

export function useThrottle<T extends (...args: never[]) => void>(func: T, delay: number): T {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const lastCall = useRef<number>(0);

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      func(...args);
    } else {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        lastCall.current = Date.now();
        func(...args);
      }, delay - (now - lastCall.current));
    }
  }) as T;
}