import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { CustomLayoutFitHandler } from './CustomLayoutFitHandler';

const fitView = vi.fn();
const useNodesInitialized = vi.fn();
const useStore = vi.fn();

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    useReactFlow: () => ({ fitView }),
    useNodesInitialized: () => useNodesInitialized(),
    useStore: (selector: (state: { width: number; height: number }) => unknown) =>
      useStore(selector),
  };
});

function createConsumedFocusTokenRef(initial?: number) {
  return { current: initial as number | undefined };
}

describe('CustomLayoutFitHandler', () => {
  beforeEach(() => {
    fitView.mockReset();
    useNodesInitialized.mockReset();
    useNodesInitialized.mockReturnValue(true);
    useStore.mockReset();
    useStore.mockImplementation((selector: (state: { width: number; height: number }) => unknown) =>
      selector({ width: 800, height: 600 }),
    );
  });

  it('fits the viewport when custom layout positions become available', () => {
    vi.useFakeTimers();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    renderHook(() => CustomLayoutFitHandler({
      layout: 'custom',
      viewportSyncKey: 'canvas-1',
      layoutKey: 'a:10,20',
      consumedFocusTokenRef,
    }));

    vi.advanceTimersByTime(50);
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 });
    vi.useRealTimers();
  });

  it('waits for nodes to initialize before fitting', () => {
    vi.useFakeTimers();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();
    useNodesInitialized.mockReturnValue(false);

    const { rerender } = renderHook(
      (props: { nodesInitialized: boolean }) => {
        useNodesInitialized.mockReturnValue(props.nodesInitialized);
        return CustomLayoutFitHandler({
          layout: 'custom',
          viewportSyncKey: 'canvas-1',
          layoutKey: 'a:10,20',
          consumedFocusTokenRef,
        });
      },
      { initialProps: { nodesInitialized: false } },
    );

    vi.advanceTimersByTime(50);
    expect(fitView).not.toHaveBeenCalled();

    rerender({ nodesInitialized: true });
    vi.advanceTimersByTime(50);
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 });
    vi.useRealTimers();
  });

  it('fits again when stored positions change', () => {
    vi.useFakeTimers();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    const { rerender } = renderHook(
      (props: { layoutKey: string }) => CustomLayoutFitHandler({
        layout: 'custom',
        viewportSyncKey: 'canvas-1',
        layoutKey: props.layoutKey,
        consumedFocusTokenRef,
      }),
      { initialProps: { layoutKey: 'a:0,0' } },
    );

    vi.advanceTimersByTime(50);
    fitView.mockClear();

    rerender({ layoutKey: 'a:120,240' });
    vi.advanceTimersByTime(50);
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 });
    vi.useRealTimers();
  });

  it('does not fit when layoutKey is unchanged', () => {
    vi.useFakeTimers();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    const { rerender } = renderHook(
      (props: { layoutKey: string }) => CustomLayoutFitHandler({
        layout: 'custom',
        viewportSyncKey: 'canvas-1',
        layoutKey: props.layoutKey,
        consumedFocusTokenRef,
      }),
      { initialProps: { layoutKey: 'a:10,20' } },
    );

    vi.advanceTimersByTime(50);
    fitView.mockClear();
    rerender({ layoutKey: 'a:10,20' });
    vi.advanceTimersByTime(50);
    expect(fitView).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('waits for the graph container to have dimensions before fitting', () => {
    vi.useFakeTimers();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();
    useStore.mockImplementation((selector: (state: { width: number; height: number }) => unknown) =>
      selector({ width: 0, height: 0 }),
    );

    const { rerender } = renderHook(
      (props: { width: number; height: number }) => {
        useStore.mockImplementation((selector: (state: { width: number; height: number }) => unknown) =>
          selector({ width: props.width, height: props.height }),
        );
        return CustomLayoutFitHandler({
          layout: 'custom',
          viewportSyncKey: 'canvas-1:open',
          layoutKey: 'a:10,20',
          consumedFocusTokenRef,
        });
      },
      { initialProps: { width: 0, height: 0 } },
    );

    vi.advanceTimersByTime(50);
    expect(fitView).not.toHaveBeenCalled();

    rerender({ width: 640, height: 480 });
    vi.advanceTimersByTime(50);
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 });
    vi.useRealTimers();
  });

  it('fits again when the graph container resizes after pane expansion', () => {
    vi.useFakeTimers();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    const { rerender } = renderHook(
      (props: { width: number; height: number }) => {
        useStore.mockImplementation((selector: (state: { width: number; height: number }) => unknown) =>
          selector({ width: props.width, height: props.height }),
        );
        return CustomLayoutFitHandler({
          layout: 'custom',
          viewportSyncKey: 'canvas-1:true:false:true',
          layoutKey: 'a:10,20',
          consumedFocusTokenRef,
        });
      },
      { initialProps: { width: 260, height: 72 } },
    );

    vi.advanceTimersByTime(50);
    fitView.mockClear();

    rerender({ width: 1200, height: 600 });
    vi.advanceTimersByTime(50);
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 });
    vi.useRealTimers();
  });

  it('fits again when fitViewPadding changes', () => {
    vi.useFakeTimers();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    const { rerender } = renderHook(
      (props: { fitViewPadding: number }) => CustomLayoutFitHandler({
        layout: 'custom',
        viewportSyncKey: 'canvas-1',
        layoutKey: 'a:10,20',
        fitViewPadding: props.fitViewPadding,
        consumedFocusTokenRef,
      }),
      { initialProps: { fitViewPadding: 0.1 } },
    );

    vi.advanceTimersByTime(50);
    fitView.mockClear();

    rerender({ fitViewPadding: 0.3 });
    vi.advanceTimersByTime(50);
    expect(fitView).toHaveBeenCalledWith({ padding: 0.3, duration: 200 });
    vi.useRealTimers();
  });
});
