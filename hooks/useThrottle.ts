import { useRef, useCallback, useEffect } from "react";

export function useThrottle<T extends (...args: never[]) => void>(func: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallRef = useRef<number>(0);
  const funcRef = useRef(func);
  
  // Keep func ref up to date
  funcRef.current = func;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCallRef.current);
    
    if (remaining <= 0) {
      lastCallRef.current = now;
      funcRef.current(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        funcRef.current(...args);
      }, remaining);
    }
  }, [delay]) as T;
}
