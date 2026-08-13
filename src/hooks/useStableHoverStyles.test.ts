import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { GraphHoverStyles } from '../types';
import { useStableHoverStyles } from './useStableHoverStyles';

describe('useStableHoverStyles', () => {
  it('returns the same reference when style values are unchanged', () => {
    const styles: GraphHoverStyles = { dimmedOpacity: 0.25 };
    const { result, rerender } = renderHook(
      ({ value }) => useStableHoverStyles(value),
      { initialProps: { value: styles } },
    );

    const first = result.current;
    rerender({ value: { dimmedOpacity: 0.25 } });
    expect(result.current).toBe(first);
  });

  it('returns a new reference when style values change', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableHoverStyles(value),
      { initialProps: { value: { dimmedOpacity: 0.25 } as GraphHoverStyles } },
    );

    const first = result.current;
    rerender({ value: { dimmedOpacity: 0.5 } });
    expect(result.current).not.toBe(first);
    expect(result.current?.dimmedOpacity).toBe(0.5);
  });

  it('returns the same undefined reference when styles stay omitted', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableHoverStyles(value),
      { initialProps: { value: undefined as GraphHoverStyles | undefined } },
    );

    const first = result.current;
    rerender({ value: undefined });
    expect(result.current).toBe(first);
    expect(result.current).toBeUndefined();
  });
});
