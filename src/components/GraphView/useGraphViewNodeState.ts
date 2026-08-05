import { useCallback, useMemo, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import type {
  FlowNode,
  FlowEdge,
  FlowGraphNode,
  GraphAnnotation,
  GraphFocusRequest,
  LayoutType,
  NodePosition,
  NodePositionMap,
  FitViewPadding,
} from '../../types';
import { getLayoutKey } from '../../utils/annotationTransform';
import { flowNodesToPositionMap } from '../../utils/positionMap';
import { useGraphLayout } from '../../hooks/useGraphLayout';
import {
  useLayoutSync,
  useControlledSelection,
  useControlledHover,
  useAnnotationSync,
} from './hooks';

interface UseGraphViewNodeStateOptions {
  initialNodes: FlowGraphNode[];
  initialEdges: FlowEdge[];
  layout?: LayoutType;
  fitViewPadding?: FitViewPadding;
  elkWorkerUrl: string;
  annotations?: GraphAnnotation[];
  onAnnotationsChange?: (annotations: GraphAnnotation[]) => void;
  onGraphNodeDragStop?: (nodeId: string, position: NodePosition, allPositions: NodePositionMap) => void;
  onLayoutComplete?: (positions: NodePositionMap) => void;
  selectedIds?: string[];
  hoveredNodeId?: string | null;
  hoveredEdgeId?: string | null;
  focusRequest?: GraphFocusRequest | null;
}

export function useGraphViewNodeState({
  initialNodes,
  initialEdges,
  layout = 'hierarchical',
  fitViewPadding,
  elkWorkerUrl,
  annotations,
  onAnnotationsChange,
  onGraphNodeDragStop,
  onLayoutComplete,
  selectedIds,
  hoveredNodeId,
  hoveredEdgeId,
  focusRequest,
}: UseGraphViewNodeStateOptions) {
  const { fitView } = useReactFlow();
  const consumedFocusTokenRef = useRef<number | undefined>(undefined);

  const { nodes: layoutedNodes, edges: layoutedEdges, isLayouting } = useGraphLayout({
    nodes: initialNodes,
    edges: initialEdges,
    layout,
    elkWorkerUrl,
    onLayoutComplete,
  });

  const layoutKey = useMemo(() => getLayoutKey(layoutedNodes), [layoutedNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const getGraphNodePositions = useCallback(
    () => flowNodesToPositionMap(nodesRef.current),
    [],
  );

  const { handleNodeDragStop, annotationActions } = useAnnotationSync({
    annotations,
    layoutedNodes,
    layoutKey,
    layout,
    setNodes,
    onAnnotationsChange,
    onGraphNodeDragStop,
    getGraphNodePositions,
  });

  useLayoutSync({
    layoutedNodes,
    layoutedEdges,
    isLayouting,
    layoutKey,
    layout,
    fitViewPadding,
    setNodes,
    setEdges,
    fitView,
    focusRequest,
    consumedFocusTokenRef,
  });

  useControlledSelection(selectedIds, setNodes, setEdges);
  useControlledHover(hoveredNodeId, hoveredEdgeId, setNodes, setEdges);

  return {
    isLayouting,
    nodes,
    edges,
    layoutKey,
    onNodesChange,
    onEdgesChange,
    handleNodeDragStop,
    annotationActions,
    consumedFocusTokenRef,
  };
}
