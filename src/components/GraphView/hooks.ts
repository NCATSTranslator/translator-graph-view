import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import type {
  FlowNode,
  FlowGraphNode,
  FlowEdge,
  GraphData,
  GraphNode,
  GraphEdge,
  GraphNodeData,
  GraphEdgeData,
  GraphAnnotation,
  GraphFocusRequest,
  HoverAnchorPosition,
  HoverGeometry,
  NodePosition,
  NodePositionMap,
  LayoutType,
  FitViewPadding,
} from '../../types';
import type { AnnotationActions } from '../../hooks/useAnnotationActions';
import { readOnlyAnnotationActions } from '../../hooks/useAnnotationActions';
import {
  isAnnotationNode,
  isGraphNode,
  mergeGraphAndAnnotationNodes,
  getLayoutKey,
  getGraphStructureKey,
  getAnnotationsKey,
} from '../../utils/annotationTransform';
import { measureNodeGeometry, measureEdgeGeometry } from '../../utils/hoverGeometry';
import { getFitViewPaddingKey } from '../../utils/positionMap';
import {
  DEFAULT_FIT_VIEW_PADDING,
  scheduleFitView,
} from './constants';

export { DEFAULT_FIT_VIEW_PADDING, FIT_VIEW_DURATION_MS } from './constants';

type SetNodes = Dispatch<SetStateAction<FlowNode[]>>;
type SetEdges = Dispatch<SetStateAction<FlowEdge[]>>;

/** True when a focus request has a token that has not yet been consumed. */
export function hasPendingFocusRequest(
  focusRequest: GraphFocusRequest | null | undefined,
  consumedTokenRef: MutableRefObject<number | undefined>,
): boolean {
  const token = focusRequest?.token;
  if (token == null || !focusRequest?.nodeId) return false;
  return consumedTokenRef.current !== token;
}

/**
 * Push a fresh layout result into React Flow's controlled state and
 * fit the viewport after the DOM commits. Annotation nodes are owned by
 * {@link useAnnotationSync}. For `layout: 'custom'`, only edges are synced here;
 * graph node positions are handled by {@link useAnnotationSync}.
 */
export interface UseLayoutSyncOptions {
  layoutedNodes: FlowGraphNode[];
  layoutedEdges: FlowEdge[];
  isLayouting: boolean;
  layoutKey: string;
  layout?: LayoutType;
  fitViewPadding?: FitViewPadding;
  setNodes: SetNodes;
  setEdges: SetEdges;
  fitView: (opts?: { padding?: FitViewPadding; duration?: number }) => void;
  focusRequest?: GraphFocusRequest | null;
  consumedFocusTokenRef: MutableRefObject<number | undefined>;
}

export function useLayoutSync({
  layoutedNodes,
  layoutedEdges,
  isLayouting,
  layoutKey,
  layout,
  fitViewPadding = DEFAULT_FIT_VIEW_PADDING,
  setNodes,
  setEdges,
  fitView,
  focusRequest,
  consumedFocusTokenRef,
}: UseLayoutSyncOptions): void {
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;
  const fitViewPaddingRef = useRef(fitViewPadding);
  fitViewPaddingRef.current = fitViewPadding;
  const prevFitViewSyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLayouting || layoutedNodes.length === 0) return;

    if (layout === 'custom') {
      setEdges(layoutedEdges);
      return;
    }

    // Preserve annotation nodes already on the canvas. useAnnotationSync owns
    // merging from props, but layout sync can re-run when fitView identity
    // changes and must not wipe annotations added since the last layout pass.
    setNodes((current) => {
      const annotationNodes = current.filter(isAnnotationNode);
      return [...layoutedNodes, ...annotationNodes];
    });
    setEdges(layoutedEdges);

    const fitViewSyncKey = `${layoutKey}|${getFitViewPaddingKey(fitViewPadding)}`;
    const shouldFitView = prevFitViewSyncKeyRef.current !== fitViewSyncKey;
    prevFitViewSyncKeyRef.current = fitViewSyncKey;
    if (!shouldFitView) return;
    // Defer to useFocusNode when a focus request is waiting for layout to finish.
    if (hasPendingFocusRequest(focusRequest, consumedFocusTokenRef)) return;

    return scheduleFitView(
      (opts) => fitViewRef.current(opts),
      fitViewPaddingRef.current,
    );
  }, [layoutKey, layoutedNodes, layoutedEdges, isLayouting, layout, fitViewPadding, setNodes, setEdges, focusRequest, consumedFocusTokenRef]);
}

function mergeCustomGraphNodes(
  layoutedNodes: FlowGraphNode[],
  currentNodes: FlowNode[],
  lastAppliedPositions: Map<string, NodePosition>,
): FlowGraphNode[] {
  const currentGraphById = new Map(
    currentNodes.filter(isGraphNode).map((node) => [node.id, node]),
  );

  return layoutedNodes.map((layoutNode) => {
    const existing = currentGraphById.get(layoutNode.id);
    if (!existing) {
      return layoutNode;
    }

    const lastApplied = lastAppliedPositions.get(layoutNode.id);
    const userMoved = lastApplied !== undefined
      && (existing.position.x !== lastApplied.x || existing.position.y !== lastApplied.y);

    if (userMoved) {
      return {
        ...layoutNode,
        position: existing.position,
        selected: existing.selected,
        data: {
          ...layoutNode.data,
          selected: layoutNode.data.selected,
          hovered: layoutNode.data.hovered,
        },
      };
    }

    return layoutNode;
  });
}

export interface UseAnnotationSyncOptions {
  annotations?: GraphAnnotation[];
  layoutedNodes: FlowGraphNode[];
  layoutKey?: string;
  layout?: LayoutType;
  setNodes: SetNodes;
  onAnnotationsChange?: (annotations: GraphAnnotation[]) => void;
  onGraphNodeDragStop?: (nodeId: string, position: NodePosition, allPositions: NodePositionMap) => void;
  getGraphNodePositions?: () => NodePositionMap;
}

export interface AnnotationSyncHandlers {
  handleNodeDragStop: (_event: React.MouseEvent, node: Node) => void;
  annotationActions: AnnotationActions;
}

/**
 * Keep annotation nodes in sync with the controlled `annotations` prop,
 * sync custom-layout graph node positions, and emit position updates after drag.
 * For ELK layouts, graph nodes are synced via {@link useLayoutSync}.
 */
export function useAnnotationSync({
  annotations,
  layoutedNodes,
  layoutKey: layoutKeyProp,
  layout,
  setNodes,
  onAnnotationsChange,
  onGraphNodeDragStop,
  getGraphNodePositions = () => ({}),
}: UseAnnotationSyncOptions): AnnotationSyncHandlers {
  const layoutedNodesRef = useRef(layoutedNodes);
  layoutedNodesRef.current = layoutedNodes;

  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  const lastAppliedPositionsRef = useRef<Map<string, NodePosition>>(new Map());
  const prevGraphStructureKeyRef = useRef<string>('');

  const readOnly = !onAnnotationsChange;

  const updateAnnotations = useCallback(
    (updater: (prev: GraphAnnotation[]) => GraphAnnotation[]) => {
      if (!onAnnotationsChange) return;
      onAnnotationsChange(updater(annotationsRef.current ?? []));
    },
    [onAnnotationsChange],
  );

  const onTextChange = useCallback(
    (id: string, text: string) => {
      updateAnnotations((prev) => prev.map((annotation) => (
        annotation.id === id ? { ...annotation, text } : annotation
      )));
    },
    [updateAnnotations],
  );

  const onDelete = useCallback(
    (id: string) => {
      updateAnnotations((prev) => prev.filter((annotation) => annotation.id !== id));
    },
    [updateAnnotations],
  );

  const annotationActions = useMemo<AnnotationActions>(
    () => (
      readOnly
        ? readOnlyAnnotationActions
        : { onTextChange, onDelete, readOnly: false }
    ),
    [readOnly, onTextChange, onDelete],
  );

  const layoutKey = layoutKeyProp ?? getLayoutKey(layoutedNodes);
  const graphStructureKey = getGraphStructureKey(layoutedNodes);
  const graphSyncKey = layout === 'custom'
    ? `${graphStructureKey}|${layoutKey}`
    : layoutKey;
  const annotationsKey = getAnnotationsKey(annotations);

  useEffect(() => {
    if (layout === 'custom') {
      if (graphStructureKey !== prevGraphStructureKeyRef.current) {
        prevGraphStructureKeyRef.current = graphStructureKey;
        const layoutedIds = new Set(layoutedNodesRef.current.map((node) => node.id));
        for (const id of lastAppliedPositionsRef.current.keys()) {
          if (!layoutedIds.has(id)) {
            lastAppliedPositionsRef.current.delete(id);
          }
        }
      }

      setNodes((current) => {
        const layouted = layoutedNodesRef.current;
        const graphNodes = current.some(isGraphNode)
          ? mergeCustomGraphNodes(layouted, current, lastAppliedPositionsRef.current)
          : layouted;

        for (const node of graphNodes) {
          lastAppliedPositionsRef.current.set(node.id, { ...node.position });
        }

        return mergeGraphAndAnnotationNodes(
          graphNodes,
          annotationsRef.current,
          readOnly,
        );
      });
      return;
    }

    lastAppliedPositionsRef.current = new Map();
    prevGraphStructureKeyRef.current = '';

    setNodes(mergeGraphAndAnnotationNodes(
      layoutedNodesRef.current,
      annotationsRef.current,
      readOnly,
    ));
  }, [graphSyncKey, annotationsKey, layout, graphStructureKey, readOnly, setNodes]);

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isAnnotationNode(node as FlowNode)) {
        if (!onAnnotationsChange) return;
        onAnnotationsChange(
          (annotationsRef.current ?? []).map((annotation) => (
            annotation.id === node.id
              ? { ...annotation, position: { x: node.position.x, y: node.position.y } }
              : annotation
          )),
        );
        return;
      }
      const allPositions = getGraphNodePositions();
      allPositions[node.id] = { x: node.position.x, y: node.position.y };
      onGraphNodeDragStop?.(
        node.id,
        { x: node.position.x, y: node.position.y },
        allPositions,
      );
    },
    [onAnnotationsChange, onGraphNodeDragStop, getGraphNodePositions],
  );

  return { handleNodeDragStop, annotationActions };
}

/**
 * Mark nodes/edges as selected based on a controlled `selectedIds` prop.
 * Skips work when the set of ids hasn't changed.
 */
export function useControlledSelection(
  selectedIds: string[] | undefined,
  setNodes: SetNodes,
  setEdges: SetEdges,
): void {
  const prevRef = useRef<string[] | undefined>(undefined);
  useEffect(() => {
    if (!selectedIds) return;
    const prev = prevRef.current;
    if (prev && prev.length === selectedIds.length && prev.every((id, i) => id === selectedIds[i])) return;
    prevRef.current = selectedIds;

    const selectedSet = new Set(selectedIds);
    setNodes((nds) => nds.map((node) => (
      isAnnotationNode(node)
        ? node
        : { ...node, selected: selectedSet.has(node.id) }
    )));
    setEdges((eds) => eds.map((edge) => ({ ...edge, selected: selectedSet.has(edge.id) })));
  }, [selectedIds, setNodes, setEdges]);
}

const focusViewOptions = { padding: 0.4, duration: 300, maxZoom: 1.2 };

/** rAF retries while waiting for a node to appear in the React Flow store. */
export const FOCUS_MAX_ATTEMPTS = 30;

/**
 * Pan/zoom the viewport to frame a node when `focusRequest.token` changes.
 * Must run inside a mounted {@link ReactFlow} tree so the store can resolve nodes.
 * `consumedTokenRef` lives on a parent that survives ReactFlow remounts so each
 * token is only acted on once.
 *
 * The token is marked consumed as soon as the target node is found, before
 * `fitView` resolves. If `fitView` fails silently the token will not retry
 * until the consumer bumps it.
 *
 * When the node is not in the store yet, focus retries for up to
 * {@link FOCUS_MAX_ATTEMPTS} animation frames (~500 ms). After that the attempt
 * stops without consuming the token; a remount or a new token is required to retry.
 */
export function useFocusNode(
  focusRequest: GraphFocusRequest | null | undefined,
  consumedTokenRef: MutableRefObject<number | undefined>,
): void {
  const { fitView, getNode } = useReactFlow();
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;
  const getNodeRef = useRef(getNode);
  getNodeRef.current = getNode;

  const focusToken = focusRequest?.token;
  const focusNodeId = focusRequest?.nodeId;

  useEffect(() => {
    if (focusToken == null || !focusNodeId) return;
    if (consumedTokenRef.current === focusToken) return;

    let cancelled = false;
    let attempts = 0;
    let frameId = 0;

    const tryFocus = () => {
      if (cancelled) return;

      if (!getNodeRef.current(focusNodeId)) {
        if (attempts < FOCUS_MAX_ATTEMPTS) {
          attempts += 1;
          frameId = requestAnimationFrame(tryFocus);
        }
        return;
      }

      consumedTokenRef.current = focusToken;
      void fitViewRef.current({
        ...focusViewOptions,
        nodes: [{ id: focusNodeId }],
      });
    };

    tryFocus();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [focusToken, focusNodeId]);
}

/**
 * Flip the `hovered` flag on the single node/edge whose hover state changed.
 */
export function useControlledHover(
  hoveredNodeId: string | null | undefined,
  hoveredEdgeId: string | null | undefined,
  setNodes: SetNodes,
  setEdges: SetEdges,
): void {
  const prevNodeRef = useRef<string | null | undefined>(undefined);
  const prevEdgeRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const prev = prevNodeRef.current;
    if (prev === hoveredNodeId) return;
    prevNodeRef.current = hoveredNodeId;
    setNodes((nds) =>
      nds.map((node) => {
        if (isAnnotationNode(node)) return node;
        const shouldHover = node.id === hoveredNodeId;
        const wasHovered = node.id === prev;
        if (!shouldHover && !wasHovered) return node;
        return { ...node, data: { ...node.data, hovered: shouldHover } as GraphNodeData };
      }),
    );
  }, [hoveredNodeId, setNodes]);

  useEffect(() => {
    const prev = prevEdgeRef.current;
    if (prev === hoveredEdgeId) return;
    prevEdgeRef.current = hoveredEdgeId;
    setEdges((eds) =>
      eds.map((edge) => {
        const shouldHover = edge.id === hoveredEdgeId;
        const wasHovered = edge.id === prev;
        if (!shouldHover && !wasHovered) return edge;
        return { ...edge, data: { ...edge.data, hovered: shouldHover } as GraphEdgeData };
      }),
    );
  }, [hoveredEdgeId, setEdges]);
}

export interface UseHoverGeometryOptions {
  data: GraphData;
  nodeHoverAnchor: HoverAnchorPosition;
  edgeHoverAnchor: HoverAnchorPosition;
  onNodeHover?: (node: GraphNode | null, geometry: HoverGeometry | null) => void;
  onEdgeHover?: (edge: GraphEdge | null, geometry: HoverGeometry | null) => void;
  surfaceRef: React.RefObject<HTMLElement | null>;
}

export interface HoverGeometryHandlers {
  handleNodeMouseEnter: (e: React.MouseEvent, node: Node) => void;
  handleNodeMouseLeave: () => void;
  handleEdgeMouseEnter: (e: React.MouseEvent, edge: Edge) => void;
  handleEdgeMouseLeave: () => void;
  scheduleFlush: () => void;
}

type HoverTarget = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null;

interface HoverRefs {
  data: React.MutableRefObject<GraphData>;
  onNodeHover: React.MutableRefObject<UseHoverGeometryOptions['onNodeHover']>;
  onEdgeHover: React.MutableRefObject<UseHoverGeometryOptions['onEdgeHover']>;
  nodeAnchor: React.MutableRefObject<HoverAnchorPosition>;
  edgeAnchor: React.MutableRefObject<HoverAnchorPosition>;
  hoverTarget: React.MutableRefObject<HoverTarget>;
  raf: React.MutableRefObject<number | null>;
}

function useLiveHoverRefs(opts: UseHoverGeometryOptions): HoverRefs {
  const data = useRef(opts.data);
  data.current = opts.data;
  const onNodeHover = useRef(opts.onNodeHover);
  onNodeHover.current = opts.onNodeHover;
  const onEdgeHover = useRef(opts.onEdgeHover);
  onEdgeHover.current = opts.onEdgeHover;
  const nodeAnchor = useRef(opts.nodeHoverAnchor);
  nodeAnchor.current = opts.nodeHoverAnchor;
  const edgeAnchor = useRef(opts.edgeHoverAnchor);
  edgeAnchor.current = opts.edgeHoverAnchor;
  const hoverTarget = useRef<HoverTarget>(null);
  const raf = useRef<number | null>(null);
  return { data, onNodeHover, onEdgeHover, nodeAnchor, edgeAnchor, hoverTarget, raf };
}

function measureTarget(
  target: NonNullable<HoverTarget>,
  refs: HoverRefs,
  root: Element,
): void {
  if (target.kind === 'node') {
    const cb = refs.onNodeHover.current;
    if (!cb) return;
    const graphNode = refs.data.current.nodes[target.id];
    if (!graphNode) return;
    cb(graphNode, measureNodeGeometry(target.id, refs.nodeAnchor.current, root));
  } else {
    const cb = refs.onEdgeHover.current;
    if (!cb) return;
    const graphEdge = refs.data.current.edges[target.id];
    if (!graphEdge) return;
    cb(graphEdge, measureEdgeGeometry(target.id, refs.edgeAnchor.current, root));
  }
}

/**
 * Tracks the currently hovered node/edge and re-measures its geometry on
 * viewport changes via rAF, invoking `onNodeHover`/`onEdgeHover` with the
 * updated anchor point.
 */
export function useHoverGeometry(opts: UseHoverGeometryOptions): HoverGeometryHandlers {
  const { nodeHoverAnchor, edgeHoverAnchor, onNodeHover, onEdgeHover, surfaceRef } = opts;
  const refs = useLiveHoverRefs(opts);

  const cancelFlush = useCallback(() => {
    if (refs.raf.current !== null) {
      cancelAnimationFrame(refs.raf.current);
      refs.raf.current = null;
    }
  }, [refs]);

  const scheduleFlush = useCallback(() => {
    const target = refs.hoverTarget.current;
    if (!target || refs.raf.current !== null) return;
    refs.raf.current = requestAnimationFrame(() => {
      refs.raf.current = null;
      const root = surfaceRef.current;
      if (root) measureTarget(target, refs, root);
    });
  }, [refs, surfaceRef]);

  useEffect(() => () => cancelFlush(), [cancelFlush]);

  const handleNodeMouseEnter = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (!onNodeHover || isAnnotationNode(node as FlowNode)) return;
      const graphNode = refs.data.current.nodes[node.id];
      if (!graphNode) return;
      refs.hoverTarget.current = { kind: 'node', id: node.id };
      onNodeHover(graphNode, measureNodeGeometry(node.id, nodeHoverAnchor, surfaceRef.current));
    },
    [onNodeHover, nodeHoverAnchor, surfaceRef, refs],
  );

  const handleNodeMouseLeave = useCallback(() => {
    cancelFlush();
    refs.hoverTarget.current = null;
    if (onNodeHover) onNodeHover(null, null);
  }, [onNodeHover, cancelFlush, refs]);

  const handleEdgeMouseEnter = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      if (!onEdgeHover) return;
      const graphEdge = refs.data.current.edges[edge.id];
      if (!graphEdge) return;
      refs.hoverTarget.current = { kind: 'edge', id: edge.id };
      onEdgeHover(graphEdge, measureEdgeGeometry(edge.id, edgeHoverAnchor, surfaceRef.current));
    },
    [onEdgeHover, edgeHoverAnchor, surfaceRef, refs],
  );

  const handleEdgeMouseLeave = useCallback(() => {
    cancelFlush();
    refs.hoverTarget.current = null;
    if (onEdgeHover) onEdgeHover(null, null);
  }, [onEdgeHover, cancelFlush, refs]);

  return {
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleEdgeMouseEnter,
    handleEdgeMouseLeave,
    scheduleFlush,
  };
}
