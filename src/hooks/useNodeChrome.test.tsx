import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { NodeChromeContext, useNodeChrome, useNodeChromeValue } from './useNodeChrome';

describe('useNodeChrome', () => {
  it('returns empty defaults when no provider is present', () => {
    const { result } = renderHook(() => useNodeChrome());
    expect(result.current.nodeChrome).toBeUndefined();
    expect(result.current.onNodeRemove).toBeUndefined();
    expect(result.current.onNodeMenu).toBeUndefined();
  });

  it('returns the provider value when wrapped', () => {
    const onNodeRemove = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        NodeChromeContext.Provider,
        { value: { onNodeRemove } },
        children,
      );
    const { result } = renderHook(() => useNodeChrome(), { wrapper });
    expect(result.current.onNodeRemove).toBe(onNodeRemove);
  });
});

describe('useNodeChromeValue', () => {
  it('omits callbacks when the parent did not provide them', () => {
    const { result } = renderHook(() => useNodeChromeValue({}));
    expect(result.current.onNodeRemove).toBeUndefined();
    expect(result.current.onNodeMenu).toBeUndefined();
  });

  it('keeps callback identities stable when parent handlers change', () => {
    const { result, rerender } = renderHook(
      (props: { onNodeRemove: (id: string) => void }) => useNodeChromeValue(props),
      { initialProps: { onNodeRemove: vi.fn() } },
    );

    const first = result.current.onNodeRemove;
    const latest = vi.fn();
    rerender({ onNodeRemove: latest });

    expect(result.current.onNodeRemove).toBe(first);
    result.current.onNodeRemove?.('n1');
    expect(latest).toHaveBeenCalledWith('n1');
  });

  it('drops onNodeRemove when the parent omits it', () => {
    const { result, rerender } = renderHook(
      ({ onNodeRemove }: { onNodeRemove?: (id: string) => void }) =>
        useNodeChromeValue({ onNodeRemove }),
      { initialProps: { onNodeRemove: vi.fn() as ((id: string) => void) | undefined } },
    );

    expect(result.current.onNodeRemove).toBeTypeOf('function');
    rerender({ onNodeRemove: undefined });
    expect(result.current.onNodeRemove).toBeUndefined();
  });

  it('keeps nodeChrome stable when slot renderers are the same functions', () => {
    const topLeft = () => null;
    const { result, rerender } = renderHook(
      ({ nodeChrome }) => useNodeChromeValue({ nodeChrome }),
      { initialProps: { nodeChrome: { topLeft } } },
    );

    const first = result.current.nodeChrome;
    rerender({ nodeChrome: { topLeft } });
    expect(result.current.nodeChrome).toBe(first);
  });
});
