import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type {
  FlowNode,
  FlowEdge,
  GraphData,
  GraphNode,
  GraphEdge,
  GraphNodeData,
  GraphEdgeData,
  HoverAnchorPosition,
  HoverGeometry,
} from '../../types';
import { measureNodeGeometry, measureEdgeGeometry } from '../../utils/hoverGeometry';

type SetNodes = Dispatch<SetStateAction<FlowNode[]>>;
type SetEdges = Dispatch<SetStateAction<FlowEdge[]>>;

/**
 * Push a fresh layout result into React Flow's controlled state and
 * fit the viewport after the DOM commits.
 */
export interface UseLayoutSyncOptions {
  layoutedNodes: FlowNode[];
  layoutedEdges: FlowEdge[];
  isLayouting: boolean;
  setNodes: SetNodes;
  setEdges: SetEdges;
  fitView: (opts?: { padding?: number; duration?: number }) => void;
}

export function useLayoutSync({
  layoutedNodes, layoutedEdges, isLayouting, setNodes, setEdges, fitView,
}: UseLayoutSyncOptions): void {
  useEffect(() => {
    if (isLayouting || layoutedNodes.length === 0) return;
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    const timer = setTimeout(() => {
      fitView({ padding: 0.1, duration: 200 });
    }, 50);
    return () => clearTimeout(timer);
  }, [layoutedNodes, layoutedEdges, isLayouting, setNodes, setEdges, fitView]);
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
    setNodes((nds) => nds.map((node) => ({ ...node, selected: selectedSet.has(node.id) })));
    setEdges((eds) => eds.map((edge) => ({ ...edge, selected: selectedSet.has(edge.id) })));
  }, [selectedIds, setNodes, setEdges]);
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
      if (!onNodeHover) return;
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
