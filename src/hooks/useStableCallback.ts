import { useCallback, useRef } from 'react';

/**
 * Stable function identity that always invokes the latest callback.
 * Returns undefined when the callback is omitted so optional APIs can be dropped.
 */
export function useStableCallback<Args extends unknown[], R>(
  callback: ((...args: Args) => R) | undefined,
): ((...args: Args) => R) | undefined {
  const ref = useRef(callback);
  ref.current = callback;

  const stable = useCallback((...args: Args) => {
    return ref.current?.(...args) as R;
  }, []);

  return callback ? stable : undefined;
}
