import { useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import type { FlowNode, FlowEdge, FlowGraphNode, GraphAnnotation, GraphFocusRequest, LayoutType } from '../../types';
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
  elkWorkerUrl: string;
  annotations?: GraphAnnotation[];
  onAnnotationsChange?: (annotations: GraphAnnotation[]) => void;
  selectedIds?: string[];
  hoveredNodeId?: string | null;
  hoveredEdgeId?: string | null;
  focusRequest?: GraphFocusRequest | null;
}

export function useGraphViewNodeState({
  initialNodes,
  initialEdges,
  layout = 'hierarchical',
  elkWorkerUrl,
  annotations,
  onAnnotationsChange,
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
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  useLayoutSync({
    layoutedNodes,
    layoutedEdges,
    isLayouting,
    setNodes,
    setEdges,
    fitView,
    focusRequest,
    consumedFocusTokenRef,
  });

  const { handleNodeDragStop, annotationActions } = useAnnotationSync({
    annotations,
    layoutedNodes,
    setNodes,
    onAnnotationsChange,
  });

  useControlledSelection(selectedIds, setNodes, setEdges);
  useControlledHover(hoveredNodeId, hoveredEdgeId, setNodes, setEdges);

  return {
    isLayouting,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    handleNodeDragStop,
    annotationActions,
    consumedFocusTokenRef,
  };
}
