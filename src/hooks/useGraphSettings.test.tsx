import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { GraphSettingsContext, useGraphSettings } from './useGraphSettings';

describe('useGraphSettings', () => {
  it('returns default settings when no provider is present', () => {
    const { result } = renderHook(() => useGraphSettings());
    expect(result.current.multiEdgeSpacing).toBe(60);
  });

  it('returns the provider value when wrapped', () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        GraphSettingsContext.Provider,
        { value: { multiEdgeSpacing: 123 } },
        children,
      );
    const { result } = renderHook(() => useGraphSettings(), { wrapper });
    expect(result.current.multiEdgeSpacing).toBe(123);
  });
});
