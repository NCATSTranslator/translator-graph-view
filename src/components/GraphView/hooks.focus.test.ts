import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { GraphFocusRequest } from '../../types';
import { FOCUS_MAX_ATTEMPTS, useFocusNode } from './hooks';

const fitView = vi.fn();
const getNode = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    useReactFlow: () => ({ fitView, getNode }),
  };
});

async function flushAnimationFrames(count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

describe('useFocusNode', () => {
  beforeEach(() => {
    fitView.mockReset();
    getNode.mockReset();
    getNode.mockReturnValue({ id: 'a' });
  });

  it('calls fitView when focusRequest token changes', () => {
    const consumedTokenRef = { current: undefined as number | undefined };

    const { rerender } = renderHook(
      (props: { focusRequest: GraphFocusRequest | null }) =>
        useFocusNode(props.focusRequest, consumedTokenRef),
      { initialProps: { focusRequest: null as GraphFocusRequest | null } },
    );

    rerender({ focusRequest: { nodeId: 'a', token: 1 } });

    expect(getNode).toHaveBeenCalledWith('a');
    expect(fitView).toHaveBeenCalledWith({
      padding: 0.4,
      duration: 300,
      maxZoom: 1.2,
      nodes: [{ id: 'a' }],
    });
    expect(consumedTokenRef.current).toBe(1);

    rerender({ focusRequest: { nodeId: 'a', token: 2 } });
    expect(fitView).toHaveBeenCalledTimes(2);
  });

  it('does not call fitView when the token was already consumed', () => {
    getNode.mockReturnValue(undefined);
    const consumedTokenRef = { current: 1 as number | undefined };

    renderHook(() => useFocusNode({ nodeId: 'missing', token: 1 }, consumedTokenRef));

    expect(fitView).not.toHaveBeenCalled();
  });

  it('retries focus when the node appears after the initial request', async () => {
    let callCount = 0;
    getNode.mockImplementation(() => {
      callCount += 1;
      return callCount >= 2 ? { id: 'a' } : undefined;
    });
    const consumedTokenRef = { current: undefined as number | undefined };

    renderHook(() => useFocusNode({ nodeId: 'a', token: 1 }, consumedTokenRef));

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(fitView).toHaveBeenCalledWith({
      padding: 0.4,
      duration: 300,
      maxZoom: 1.2,
      nodes: [{ id: 'a' }],
    });
  });

  it('does not re-focus after remount when the token was already consumed', () => {
    const consumedTokenRef = { current: 1 as number | undefined };

    const { unmount } = renderHook(
      () => useFocusNode({ nodeId: 'a', token: 1 }, consumedTokenRef),
    );

    expect(fitView).not.toHaveBeenCalled();

    unmount();
    fitView.mockClear();

    renderHook(
      () => useFocusNode({ nodeId: 'a', token: 1 }, consumedTokenRef),
    );

    expect(fitView).not.toHaveBeenCalled();
  });

  it('stops retrying after FOCUS_MAX_ATTEMPTS without consuming the token', async () => {
    getNode.mockReturnValue(undefined);
    const consumedTokenRef = { current: undefined as number | undefined };

    renderHook(() => useFocusNode({ nodeId: 'a', token: 1 }, consumedTokenRef));

    await flushAnimationFrames(FOCUS_MAX_ATTEMPTS);
    expect(fitView).not.toHaveBeenCalled();
    expect(consumedTokenRef.current).toBeUndefined();

    getNode.mockReturnValue({ id: 'a' });
    await flushAnimationFrames(1);
    expect(fitView).not.toHaveBeenCalled();
  });
});
