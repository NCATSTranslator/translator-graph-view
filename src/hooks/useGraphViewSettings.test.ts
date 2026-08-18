import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGraphViewSettings } from './useGraphViewSettings';

describe('useGraphViewSettings', () => {
  it('defaults multiEdgeSpacing to 60', () => {
    const { result } = renderHook(() => useGraphViewSettings({}));
    expect(result.current.multiEdgeSpacing).toBe(60);
  });

  it('returns the same reference when style values are unchanged', () => {
    const { result, rerender } = renderHook(
      ({ hoverStyles }) => useGraphViewSettings({ hoverStyles }),
      { initialProps: { hoverStyles: { dimmedOpacity: 0.25 } } },
    );

    const first = result.current;
    rerender({ hoverStyles: { dimmedOpacity: 0.25 } });
    expect(result.current).toBe(first);
  });

  it('returns a new reference when style values change', () => {
    const { result, rerender } = renderHook(
      ({ hoverStyles }) => useGraphViewSettings({ hoverStyles }),
      { initialProps: { hoverStyles: { dimmedOpacity: 0.25 } } },
    );

    const first = result.current;
    rerender({ hoverStyles: { dimmedOpacity: 0.5 } });
    expect(result.current).not.toBe(first);
    expect(result.current.hoverStyles?.dimmedOpacity).toBe(0.5);
  });
});
