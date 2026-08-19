import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStableCallback } from './useStableCallback';

describe('useStableCallback', () => {
  it('returns undefined when no callback is provided', () => {
    const { result } = renderHook(() => useStableCallback(undefined));
    expect(result.current).toBeUndefined();
  });

  it('keeps identity stable when the parent callback changes', () => {
    const { result, rerender } = renderHook(
      ({ callback }: { callback: (id: string) => void }) => useStableCallback(callback),
      { initialProps: { callback: vi.fn() } },
    );

    const first = result.current;
    const latest = vi.fn();
    rerender({ callback: latest });

    expect(result.current).toBe(first);
    result.current?.('n1');
    expect(latest).toHaveBeenCalledWith('n1');
  });

  it('drops the stable callback when the parent omits it', () => {
    const { result, rerender } = renderHook(
      ({ callback }: { callback?: (id: string) => void }) => useStableCallback(callback),
      { initialProps: { callback: vi.fn() as ((id: string) => void) | undefined } },
    );

    expect(result.current).toBeTypeOf('function');
    rerender({ callback: undefined });
    expect(result.current).toBeUndefined();
  });
});
