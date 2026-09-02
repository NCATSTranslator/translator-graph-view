import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { GraphAnnotation, FlowGraphNode, FlowNode } from '../../types';
import { useLayoutSync, useAnnotationSync, hasPendingFocusRequest } from './hooks';
import { mergeGraphAndAnnotationNodes, getLayoutKey } from '../../utils/annotationTransform';

const fitView = vi.fn();

const graphNode: FlowGraphNode = {
  id: 'a',
  type: 'graphNode',
  position: { x: 0, y: 0 },
  data: {
    label: 'A',
    graphNode: { id: 'a', names: ['A'], types: ['biolink:Drug'] },
    primaryType: 'Drug',
  },
};

const layoutedGraph = [{ ...graphNode, position: { x: 10, y: 20 } }];

const annotations: GraphAnnotation[] = [
  { id: 'ann-1', text: 'Note', position: { x: 50, y: 50 } },
];

const defaultGraphNodePositions = () => ({ a: { x: 10, y: 20 } });

function createConsumedFocusTokenRef(initial?: number) {
  return { current: initial as number | undefined };
}

/** Run the latest setNodes updater so custom-layout position tracking refs are seeded. */
function seedCustomLayoutBaseline(
  setNodes: ReturnType<typeof vi.fn>,
  current: FlowNode[] = [],
) {
  const updater = setNodes.mock.calls.at(-1)?.[0];
  if (typeof updater === 'function') {
    act(() => { updater(current); });
  }
}

describe('hasPendingFocusRequest', () => {
  it('returns true when a focus token has not been consumed', () => {
    const consumedFocusTokenRef = createConsumedFocusTokenRef();
    expect(hasPendingFocusRequest({ nodeId: 'a', token: 1 }, consumedFocusTokenRef)).toBe(true);
  });

  it('returns false when the focus token was already consumed', () => {
    const consumedFocusTokenRef = createConsumedFocusTokenRef(1);
    expect(hasPendingFocusRequest({ nodeId: 'a', token: 1 }, consumedFocusTokenRef)).toBe(false);
  });
});

describe('useLayoutSync', () => {
  beforeEach(() => {
    fitView.mockReset();
  });

  it('sets layouted graph nodes while preserving existing annotation nodes', () => {
    vi.useFakeTimers();
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();
    const annotationNode = mergeGraphAndAnnotationNodes([], annotations, false)[0];

    renderHook(() => useLayoutSync({
      layoutedNodes: layoutedGraph,
      layoutedEdges: [],
      isLayouting: false,
      layoutKey: getLayoutKey(layoutedGraph),
      setNodes,
      setEdges,
      fitView,
      consumedFocusTokenRef,
    }));

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = setNodes.mock.calls[0][0] as (current: FlowNode[]) => FlowNode[];
    expect(updateNodes([])).toEqual(layoutedGraph);
    expect(updateNodes([annotationNode])).toEqual([...layoutedGraph, annotationNode]);

    const hoveredGraphNode: FlowNode = {
      ...graphNode,
      data: { ...graphNode.data, hovered: true, dimmed: false },
    };
    const dimmedAnnotation = {
      ...annotationNode,
      data: { ...annotationNode.data, dimmed: true },
    } as FlowNode;
    const restored = updateNodes([hoveredGraphNode, dimmedAnnotation]);
    expect(restored.find((node) => node.id === 'a')?.data).toMatchObject({
      hovered: true,
      dimmed: false,
    });
    expect(restored.find((node) => node.id === 'ann-1')?.data).toMatchObject({
      dimmed: true,
    });

    expect(setEdges).toHaveBeenCalledTimes(1);
    const updateEdges = setEdges.mock.calls[0][0] as (current: unknown[]) => unknown[];
    expect(updateEdges([])).toEqual([]);
    vi.advanceTimersByTime(50);
    expect(fitView).toHaveBeenCalledWith({ padding: 0.1, duration: 200 });
    vi.useRealTimers();
  });

  it('does not fit the viewport when layout positions are unchanged', () => {
    vi.useFakeTimers();
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    const { rerender } = renderHook(
      (props: { layoutedNodes: FlowGraphNode[] }) => useLayoutSync({
        layoutedNodes: props.layoutedNodes,
        layoutedEdges: [],
        isLayouting: false,
        layoutKey: getLayoutKey(props.layoutedNodes),
        setNodes,
        setEdges,
        fitView,
        consumedFocusTokenRef,
      }),
      { initialProps: { layoutedNodes: layoutedGraph } },
    );

    fitView.mockClear();
    rerender({ layoutedNodes: [{ ...layoutedGraph[0] }] });

    vi.advanceTimersByTime(50);
    expect(setNodes).toHaveBeenCalled();
    expect(fitView).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('uses fitViewPadding when framing the graph', () => {
    vi.useFakeTimers();
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();
    const fitViewPadding = { top: '48px' as const, right: 0.2, bottom: 0.2, left: 0.2 };

    renderHook(() => useLayoutSync({
      layoutedNodes: layoutedGraph,
      layoutedEdges: [],
      isLayouting: false,
      layoutKey: getLayoutKey(layoutedGraph),
      fitViewPadding,
      setNodes,
      setEdges,
      fitView,
      consumedFocusTokenRef,
    }));

    vi.advanceTimersByTime(50);
    expect(fitView).toHaveBeenCalledWith({ padding: fitViewPadding, duration: 200 });
    vi.useRealTimers();
  });

  it('does not fit the viewport when a focus token is still pending', () => {
    vi.useFakeTimers();
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    renderHook(() => useLayoutSync({
      layoutedNodes: layoutedGraph,
      layoutedEdges: [],
      isLayouting: false,
      layoutKey: getLayoutKey(layoutedGraph),
      setNodes,
      setEdges,
      fitView,
      focusRequest: { nodeId: 'a', token: 1 },
      consumedFocusTokenRef,
    }));

    vi.advanceTimersByTime(50);
    expect(setNodes).toHaveBeenCalled();
    expect(fitView).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('fits again when fitViewPadding changes', () => {
    vi.useFakeTimers();
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    const { rerender } = renderHook(
      (props: { fitViewPadding: number }) => useLayoutSync({
        layoutedNodes: layoutedGraph,
        layoutedEdges: [],
        isLayouting: false,
        layoutKey: getLayoutKey(layoutedGraph),
        fitViewPadding: props.fitViewPadding,
        setNodes,
        setEdges,
        fitView,
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

  it('syncs edges only for custom layout', () => {
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    renderHook(() => useLayoutSync({
      layoutedNodes: layoutedGraph,
      layoutedEdges: [],
      isLayouting: false,
      layoutKey: getLayoutKey(layoutedGraph),
      layout: 'custom',
      setNodes,
      setEdges,
      fitView,
      consumedFocusTokenRef,
    }));

    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).toHaveBeenCalledTimes(1);
    const updateEdges = setEdges.mock.calls[0][0] as (current: unknown[]) => unknown[];
    expect(updateEdges([])).toEqual([]);
    expect(fitView).not.toHaveBeenCalled();
  });
});

describe('useAnnotationSync merge', () => {
  it('merges annotations onto graph nodes', () => {
    const setNodes = vi.fn();

    renderHook(() => useAnnotationSync({
      annotations,
      layoutedNodes: layoutedGraph,
      setNodes,
      onAnnotationsChange: vi.fn(),
      getGraphNodePositions: defaultGraphNodePositions,
    }));

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = setNodes.mock.calls[0][0] as (current: FlowNode[]) => FlowNode[];
    expect(updateNodes([])).toEqual(
      mergeGraphAndAnnotationNodes(layoutedGraph, annotations, false),
    );
  });

  it('replaces annotation nodes when the annotations prop changes', () => {
    const setNodes = vi.fn();

    const { rerender } = renderHook(
      (props: { annotations?: GraphAnnotation[] }) => useAnnotationSync({
        annotations: props.annotations,
        layoutedNodes: layoutedGraph,
        setNodes,
        onAnnotationsChange: vi.fn(),
        getGraphNodePositions: defaultGraphNodePositions,
      }),
      { initialProps: { annotations } },
    );

    expect(setNodes).toHaveBeenCalled();

    setNodes.mockClear();
    rerender({
      annotations: [{ id: 'ann-2', text: 'Updated', position: { x: 80, y: 90 } }],
    });

    expect(setNodes).toHaveBeenCalled();
  });

  it('re-merges annotations as read-only when layout changes without onAnnotationsChange', () => {
    const setNodes = vi.fn();
    const layoutedA = [{ ...graphNode, position: { x: 10, y: 20 } }];
    const layoutedB = [{ ...graphNode, position: { x: 30, y: 40 } }];

    const { rerender } = renderHook(
      (props: { layoutedNodes: FlowGraphNode[] }) => useAnnotationSync({
        annotations,
        layoutedNodes: props.layoutedNodes,
        setNodes,
        getGraphNodePositions: defaultGraphNodePositions,
      }),
      { initialProps: { layoutedNodes: layoutedA } },
    );

    setNodes.mockClear();
    rerender({ layoutedNodes: layoutedB });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = setNodes.mock.calls[0][0] as (current: FlowNode[]) => FlowNode[];
    const merged = updateNodes([]);
    expect(merged).toEqual(
      mergeGraphAndAnnotationNodes(layoutedB, annotations, true),
    );
    const annotationNode = merged.find((node) => node.id === 'ann-1');
    expect(annotationNode?.draggable).toBe(false);
  });

  it('does not re-sync graph nodes in custom layout when live positions exist', () => {
    const setNodes = vi.fn();
    const layoutedA = [{ ...graphNode, position: { x: 10, y: 20 } }];
    const layoutedB = [{ ...graphNode, position: { x: 30, y: 40 } }];
    const liveGraphNode = { ...layoutedA[0], position: { x: 100, y: 200 } };

    const { rerender } = renderHook(
      (props: { layoutedNodes: FlowGraphNode[] }) => useAnnotationSync({
        layout: 'custom',
        annotations,
        layoutedNodes: props.layoutedNodes,
        setNodes,
        onAnnotationsChange: vi.fn(),
      }),
      { initialProps: { layoutedNodes: layoutedA } },
    );

    seedCustomLayoutBaseline(setNodes);
    setNodes.mockClear();
    rerender({ layoutedNodes: layoutedB });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = setNodes.mock.calls[0][0] as (current: FlowNode[]) => FlowNode[];
    const merged = updateNodes([liveGraphNode]);
    const nodeA = merged.find((node) => node.id === 'a');
    expect(nodeA?.position).toEqual({ x: 100, y: 200 });
  });

  it('seeds graph nodes from layouted positions when the canvas is still at the origin', () => {
    const setNodes = vi.fn();
    const layoutedAtOrigin = [{ ...graphNode, position: { x: 0, y: 0 } }];
    const layoutedWithPositions = [{ ...graphNode, position: { x: 120, y: 240 } }];
    const liveGraphNode = { ...layoutedAtOrigin[0], position: { x: 0, y: 0 } };

    const { rerender } = renderHook(
      (props: { layoutedNodes: FlowGraphNode[] }) => useAnnotationSync({
        layout: 'custom',
        annotations,
        layoutedNodes: props.layoutedNodes,
        setNodes,
        onAnnotationsChange: vi.fn(),
      }),
      { initialProps: { layoutedNodes: layoutedAtOrigin } },
    );

    seedCustomLayoutBaseline(setNodes, [liveGraphNode]);
    setNodes.mockClear();
    rerender({ layoutedNodes: layoutedWithPositions });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = setNodes.mock.calls[0][0] as (current: FlowNode[]) => FlowNode[];
    const merged = updateNodes([liveGraphNode]);
    const nodeA = merged.find((node) => node.id === 'a');
    expect(nodeA?.position).toEqual({ x: 120, y: 240 });
  });

  it('adds new graph nodes in custom layout while preserving live positions', () => {
    const setNodes = vi.fn();
    const layoutedA = [{ ...graphNode, position: { x: 10, y: 20 } }];
    const nodeB: FlowGraphNode = {
      ...graphNode,
      id: 'b',
      position: { x: 50, y: 50 },
      data: {
        ...graphNode.data,
        label: 'B',
        graphNode: { id: 'b', names: ['B'], types: ['biolink:Drug'] },
      },
    };
    const liveGraphNode = { ...layoutedA[0], position: { x: 100, y: 200 } };

    const { rerender } = renderHook(
      (props: { layoutedNodes: FlowGraphNode[] }) => useAnnotationSync({
        layout: 'custom',
        annotations,
        layoutedNodes: props.layoutedNodes,
        setNodes,
        onAnnotationsChange: vi.fn(),
      }),
      { initialProps: { layoutedNodes: layoutedA } },
    );

    seedCustomLayoutBaseline(setNodes);
    setNodes.mockClear();
    rerender({ layoutedNodes: [...layoutedA, nodeB] });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = setNodes.mock.calls[0][0] as (current: FlowNode[]) => FlowNode[];
    const merged = updateNodes([liveGraphNode]);
    const nodeA = merged.find((node) => node.id === 'a');
    const nodeBResult = merged.find((node) => node.id === 'b');
    expect(nodeA?.position).toEqual({ x: 100, y: 200 });
    expect(nodeBResult?.position).toEqual({ x: 50, y: 50 });
  });

  it('preserves a node intentionally placed at the origin after prop updates', () => {
    const setNodes = vi.fn();
    const layoutedA = [{ ...graphNode, position: { x: 10, y: 20 } }];
    const layoutedB = [{ ...graphNode, position: { x: 30, y: 40 } }];
    const liveGraphNode = { ...layoutedA[0], position: { x: 0, y: 0 } };

    const { rerender } = renderHook(
      (props: { layoutedNodes: FlowGraphNode[] }) => useAnnotationSync({
        layout: 'custom',
        annotations,
        layoutedNodes: props.layoutedNodes,
        setNodes,
        onAnnotationsChange: vi.fn(),
      }),
      { initialProps: { layoutedNodes: layoutedA } },
    );

    seedCustomLayoutBaseline(setNodes);
    setNodes.mockClear();
    rerender({ layoutedNodes: layoutedB });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = setNodes.mock.calls[0][0] as (current: FlowNode[]) => FlowNode[];
    const merged = updateNodes([liveGraphNode]);
    const nodeA = merged.find((node) => node.id === 'a');
    expect(nodeA?.position).toEqual({ x: 0, y: 0 });
  });
});

describe('useAnnotationSync drag', () => {
  it('calls onAnnotationsChange with updated position while preserving other annotations', () => {
    const onAnnotationsChange = vi.fn();
    const setNodes = vi.fn();
    const allAnnotations: GraphAnnotation[] = [
      { id: 'ann-1', text: 'Note', position: { x: 50, y: 50 } },
      { id: 'ann-2', text: 'Other', position: { x: 100, y: 100 } },
    ];

    const { result } = renderHook(() => useAnnotationSync({
      annotations: allAnnotations,
      layoutedNodes: layoutedGraph,
      setNodes,
      onAnnotationsChange,
      getGraphNodePositions: defaultGraphNodePositions,
    }));

    const draggedAnnotation = mergeGraphAndAnnotationNodes(
      layoutedGraph,
      allAnnotations,
      false,
    ).find((node) => node.id === 'ann-1');

    expect(draggedAnnotation).toBeDefined();
    if (!draggedAnnotation) return;

    act(() => {
      result.current.handleNodeDragStop(
        {} as React.MouseEvent,
        { ...draggedAnnotation, position: { x: 120, y: 140 } },
      );
    });

    expect(onAnnotationsChange).toHaveBeenCalledWith([
      { id: 'ann-1', text: 'Note', position: { x: 120, y: 140 } },
      { id: 'ann-2', text: 'Other', position: { x: 100, y: 100 } },
    ]);
  });
});

describe('useAnnotationSync actions', () => {
  it('exposes editable annotationActions when onAnnotationsChange is provided', () => {
    const { result } = renderHook(() => useAnnotationSync({
      annotations,
      layoutedNodes: layoutedGraph,
      setNodes: vi.fn(),
      onAnnotationsChange: vi.fn(),
    }));

    expect(result.current.annotationActions.readOnly).toBe(false);
    expect(result.current.annotationActions.onTextChange).toBeTypeOf('function');
    expect(result.current.annotationActions.onDelete).toBeTypeOf('function');
  });

  it('exposes read-only annotationActions when onAnnotationsChange is omitted', () => {
    const { result } = renderHook(() => useAnnotationSync({
      annotations,
      layoutedNodes: layoutedGraph,
      setNodes: vi.fn(),
    }));

    expect(result.current.annotationActions.readOnly).toBe(true);
  });
});
