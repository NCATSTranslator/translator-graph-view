import { useCallback, useRef } from 'react';
import {
  useOnViewportChange,
  type Node,
  type Edge,
} from '@xyflow/react';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  HoverAnchorPosition,
  HoverGeometry,
  Selection,
} from '../../types';
import { useSelection } from '../../hooks/useSelection';
import {
  useHoverGeometry,
  type HoverGeometryHandlers,
} from './hooks';

interface UseGraphViewInteractionOptions {
  data: GraphData;
  onSelectionChange?: (selection: Selection) => void;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  onNodeHover?: (node: GraphNode | null, geometry: HoverGeometry | null) => void;
  onEdgeHover?: (edge: GraphEdge | null, geometry: HoverGeometry | null) => void;
  onAnnotationHover?: (annotationId: string | null) => void;
  nodeHoverAnchor?: HoverAnchorPosition;
  edgeHoverAnchor?: HoverAnchorPosition;
}

interface GraphViewInteractionState {
  handleSelectionChange: ReturnType<typeof useSelection>['handleSelectionChange'];
  graphSurfaceRef: React.RefObject<HTMLDivElement | null>;
  hoverHandlers: HoverGeometryHandlers;
  handleNodeClick: (event: React.MouseEvent, node: Node) => void;
  handleEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
}

export function useGraphViewInteraction({
  data,
  onSelectionChange,
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  onEdgeHover,
  onAnnotationHover,
  nodeHoverAnchor = 'topCenter',
  edgeHoverAnchor = 'midpoint',
}: UseGraphViewInteractionOptions): GraphViewInteractionState {
  const { handleSelectionChange } = useSelection({ data, onSelectionChange });

  const dataRef = useRef(data);
  dataRef.current = data;

  const graphSurfaceRef = useRef<HTMLDivElement>(null);

  const hoverHandlers = useHoverGeometry({
    data,
    nodeHoverAnchor,
    edgeHoverAnchor,
    onNodeHover,
    onEdgeHover,
    onAnnotationHover,
    surfaceRef: graphSurfaceRef,
  });

  useOnViewportChange({
    onChange: hoverHandlers.scheduleFlush,
    onEnd: hoverHandlers.scheduleFlush,
  });

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!onNodeClick) return;
      const graphNode = dataRef.current.nodes[node.id];
      if (graphNode) onNodeClick(graphNode);
    },
    [onNodeClick],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (!onEdgeClick) return;
      const graphEdge = dataRef.current.edges[edge.id];
      if (graphEdge) onEdgeClick(graphEdge);
    },
    [onEdgeClick],
  );

  return {
    handleSelectionChange,
    graphSurfaceRef,
    hoverHandlers,
    handleNodeClick,
    handleEdgeClick,
  };
}
