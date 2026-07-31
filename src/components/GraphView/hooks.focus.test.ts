import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { GraphFocusRequest } from '../../types';
import { useFocusNode } from './hooks';

const fitView = vi.fn();
const getNode = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    useReactFlow: () => ({ fitView, getNode }),
  };
});

describe('useFocusNode', () => {
  beforeEach(() => {
    fitView.mockReset();
    getNode.mockReset();
    getNode.mockReturnValue({ id: 'a' });
  });

  it('calls fitView when focusRequest token changes', () => {
    const { rerender } = renderHook(
      (props: { focusRequest: GraphFocusRequest | null; isLayouting: boolean }) =>
        useFocusNode(props.focusRequest, props.isLayouting),
      { initialProps: { focusRequest: null as GraphFocusRequest | null, isLayouting: false } },
    );

    rerender({ focusRequest: { nodeId: 'a', token: 1 }, isLayouting: false });

    expect(getNode).toHaveBeenCalledWith('a');
    expect(fitView).toHaveBeenCalledWith({
      padding: 0.4,
      duration: 300,
      maxZoom: 1.2,
      nodes: [{ id: 'a' }],
    });

    rerender({ focusRequest: { nodeId: 'a', token: 2 }, isLayouting: false });
    expect(fitView).toHaveBeenCalledTimes(2);
  });

  it('skips fitView while layouting or when node is missing', () => {
    getNode.mockReturnValue(undefined);

    const { rerender } = renderHook(
      (props: { focusRequest: GraphFocusRequest | null; isLayouting: boolean }) =>
        useFocusNode(props.focusRequest, props.isLayouting),
      { initialProps: { focusRequest: { nodeId: 'missing', token: 1 }, isLayouting: true } },
    );

    expect(fitView).not.toHaveBeenCalled();

    rerender({ focusRequest: { nodeId: 'missing', token: 1 }, isLayouting: false });
    expect(fitView).not.toHaveBeenCalled();
  });

  it('retries focus when the node appears after the initial request', () => {
    getNode.mockReturnValue(undefined);

    const { rerender } = renderHook(
      (props: { focusRequest: GraphFocusRequest | null; isLayouting: boolean }) =>
        useFocusNode(props.focusRequest, props.isLayouting),
      { initialProps: { focusRequest: { nodeId: 'a', token: 1 }, isLayouting: false } },
    );

    expect(fitView).not.toHaveBeenCalled();

    getNode.mockReturnValue({ id: 'a' });
    rerender({ focusRequest: { nodeId: 'a', token: 1 }, isLayouting: false });

    expect(fitView).toHaveBeenCalledWith({
      padding: 0.4,
      duration: 300,
      maxZoom: 1.2,
      nodes: [{ id: 'a' }],
    });
  });
});
