import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { NodeChromeContext, useNodeChrome, useNodeChromeValue } from './useNodeChrome';
import type { GraphNodeColorRenderer } from '../types';

describe('useNodeChrome', () => {
  it('returns empty defaults when no provider is present', () => {
    const { result } = renderHook(() => useNodeChrome());
    expect(result.current.nodeChrome).toBeUndefined();
    expect(result.current.onNodeRemove).toBeUndefined();
    expect(result.current.onNodeMenu).toBeUndefined();
    expect(result.current.getNodeIcon).toBeUndefined();
    expect(result.current.getNodeColor).toBeUndefined();
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
    expect(result.current.getNodeIcon).toBeUndefined();
    expect(result.current.getNodeColor).toBeUndefined();
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

  it('keeps getNodeIcon identity and the context value stable when the parent renderer changes', () => {
    const { result, rerender } = renderHook(
      ({ getNodeIcon }: { getNodeIcon: () => null }) => useNodeChromeValue({ getNodeIcon }),
      { initialProps: { getNodeIcon: () => null } },
    );

    const firstValue = result.current;
    const firstIcon = result.current.getNodeIcon;
    const latest = vi.fn(() => null);
    rerender({ getNodeIcon: latest });

    expect(result.current).toBe(firstValue);
    expect(result.current.getNodeIcon).toBe(firstIcon);
    result.current.getNodeIcon?.('Drug', { id: 'n1', names: [], types: [] });
    expect(latest).toHaveBeenCalledWith('Drug', { id: 'n1', names: [], types: [] });
  });

  it('drops getNodeIcon when the parent omits it', () => {
    const { result, rerender } = renderHook(
      ({ getNodeIcon }: { getNodeIcon?: () => null }) => useNodeChromeValue({ getNodeIcon }),
      { initialProps: { getNodeIcon: (() => null) as (() => null) | undefined } },
    );

    expect(result.current.getNodeIcon).toBeTypeOf('function');
    rerender({ getNodeIcon: undefined });
    expect(result.current.getNodeIcon).toBeUndefined();
  });

  it('keeps getNodeColor identity and the context value stable when the parent renderer changes', () => {
    const { result, rerender } = renderHook(
      ({ getNodeColor }: { getNodeColor: GraphNodeColorRenderer }) =>
        useNodeChromeValue({ getNodeColor }),
      { initialProps: { getNodeColor: (() => ({ background: '#fff' })) as GraphNodeColorRenderer } },
    );

    const firstValue = result.current;
    const firstColor = result.current.getNodeColor;
    const latest = vi.fn(() => ({ background: '#000' }));
    rerender({ getNodeColor: latest as GraphNodeColorRenderer });

    expect(result.current).toBe(firstValue);
    expect(result.current.getNodeColor).toBe(firstColor);
    result.current.getNodeColor?.('Drug', { id: 'n1', names: [], types: [] });
    expect(latest).toHaveBeenCalledWith('Drug', { id: 'n1', names: [], types: [] });
  });

  it('drops getNodeColor when the parent omits it', () => {
    const { result, rerender } = renderHook(
      ({ getNodeColor }: { getNodeColor?: GraphNodeColorRenderer }) =>
        useNodeChromeValue({ getNodeColor }),
      { initialProps: { getNodeColor: (() => ({ background: '#fff' })) as GraphNodeColorRenderer | undefined } },
    );

    expect(result.current.getNodeColor).toBeTypeOf('function');
    rerender({ getNodeColor: undefined });
    expect(result.current.getNodeColor).toBeUndefined();
  });
});
