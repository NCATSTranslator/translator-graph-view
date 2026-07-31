import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { GraphAnnotation, FlowGraphNode, FlowNode } from '../../types';
import { useLayoutSync, useAnnotationSync, hasPendingFocusRequest } from './hooks';
import { mergeGraphAndAnnotationNodes } from '../../utils/annotationTransform';

const fitView = vi.fn();

const graphNode: FlowGraphNode = {
  id: 'a',
  type: 'graphNode',
  position: { x: 0, y: 0 },
  data: {
    label: 'A',
    graphNode: { id: 'a', names: ['A'], types: ['biolink:Drug'] },
    primaryType: 'Drug',
    color: '#000',
  },
};

const layoutedGraph = [{ ...graphNode, position: { x: 10, y: 20 } }];

const annotations: GraphAnnotation[] = [
  { id: 'ann-1', text: 'Note', position: { x: 50, y: 50 } },
];

function createConsumedFocusTokenRef(initial?: number) {
  return { current: initial as number | undefined };
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
      setNodes,
      setEdges,
      fitView,
      consumedFocusTokenRef,
    }));

    expect(setNodes).toHaveBeenCalledTimes(1);
    const updateNodes = setNodes.mock.calls[0][0] as (current: FlowNode[]) => FlowNode[];
    expect(updateNodes([])).toEqual(layoutedGraph);
    expect(updateNodes([annotationNode])).toEqual([...layoutedGraph, annotationNode]);
    expect(setEdges).toHaveBeenCalledWith([]);
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

  it('does not fit the viewport when a focus token is still pending', () => {
    vi.useFakeTimers();
    const setNodes = vi.fn();
    const setEdges = vi.fn();
    const consumedFocusTokenRef = createConsumedFocusTokenRef();

    renderHook(() => useLayoutSync({
      layoutedNodes: layoutedGraph,
      layoutedEdges: [],
      isLayouting: false,
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
});

describe('useAnnotationSync merge', () => {
  it('merges annotations onto graph nodes', () => {
    const setNodes = vi.fn();

    renderHook(() => useAnnotationSync({
      annotations,
      layoutedNodes: layoutedGraph,
      setNodes,
      onAnnotationsChange: vi.fn(),
    }));

    expect(setNodes).toHaveBeenCalledWith(
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
      }),
      { initialProps: { layoutedNodes: layoutedA } },
    );

    setNodes.mockClear();
    rerender({ layoutedNodes: layoutedB });

    expect(setNodes).toHaveBeenCalledWith(
      mergeGraphAndAnnotationNodes(layoutedB, annotations, true),
    );
    const merged = setNodes.mock.calls[0][0] as ReturnType<typeof mergeGraphAndAnnotationNodes>;
    const annotationNode = merged.find((node) => node.id === 'ann-1');
    expect(annotationNode?.draggable).toBe(false);
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
