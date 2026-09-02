import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { GraphAnnotationStyles } from '../types';
import { useStableAnnotationStyles } from './useStableAnnotationStyles';

describe('useStableAnnotationStyles', () => {
  it('returns the same reference when style values are unchanged', () => {
    const styles: GraphAnnotationStyles = { backgroundColor: '#fff' };
    const { result, rerender } = renderHook(
      ({ value }) => useStableAnnotationStyles(value),
      { initialProps: { value: styles } },
    );

    const first = result.current;
    rerender({ value: { backgroundColor: '#fff' } });
    expect(result.current).toBe(first);
  });

  it('returns a new reference when style values change', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableAnnotationStyles(value),
      { initialProps: { value: { backgroundColor: '#fff' } as GraphAnnotationStyles } },
    );

    const first = result.current;
    rerender({ value: { backgroundColor: '#000' } });
    expect(result.current).not.toBe(first);
    expect(result.current?.backgroundColor).toBe('#000');
  });

  it('tracks link rendering options', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useStableAnnotationStyles(value),
      { initialProps: { value: { linkify: true } as GraphAnnotationStyles } },
    );

    const first = result.current;
    rerender({ value: { linkify: false } });
    expect(result.current).not.toBe(first);

    const second = result.current;
    rerender({ value: { linkify: false, linkClassName: 'client-link' } });
    expect(result.current).not.toBe(second);
    expect(result.current?.linkClassName).toBe('client-link');
  });
});
