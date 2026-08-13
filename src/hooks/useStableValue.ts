import { useRef } from 'react';

/**
 * Keep a referentially stable value when an equality check says contents are unchanged.
 * Useful for optional style objects passed through context.
 */
export function useStableValue<T>(
  value: T | undefined,
  isEqual: (a: T, b: T) => boolean,
): T | undefined {
  const ref = useRef(value);
  const prev = ref.current;
  if (value === prev) {
    return prev;
  }
  if (value === undefined || prev === undefined || !isEqual(prev, value)) {
    ref.current = value;
  }
  return ref.current;
}
