import { useRef, useCallback, useEffect } from "react";

export function useThrottle<T extends (...args: never[]) => void>(func: T, delay: number): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCallRef = useRef<number>(0);
  const funcRef = useRef(func);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

  funcRef.current = func;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pendingArgsRef.current) {
        funcRef.current(...pendingArgsRef.current);
        pendingArgsRef.current = null;
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    pendingArgsRef.current = args;
    const now = Date.now();
    const remaining = delay - (now - lastCallRef.current);

    if (remaining <= 0) {
      lastCallRef.current = now;
      pendingArgsRef.current = null;
      funcRef.current(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        const pending = pendingArgsRef.current;
        pendingArgsRef.current = null;
        if (pending) {
          funcRef.current(...pending);
        }
      }, remaining);
    }
  }, [delay]) as T;
}
