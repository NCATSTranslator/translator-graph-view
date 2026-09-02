import { useCallback, useRef } from 'react';
import {
  useOnViewportChange,
  type Node,
  type Edge,
} from '@xyflow/react';
import type {
  DeleteSelection,
  FlowNode,
  GraphData,
  GraphNode,
  GraphEdge,
  HoverAnchorPosition,
  HoverGeometry,
  Selection,
} from '../../types';
import { isAnnotationNode } from '../../utils/annotationTransform';
import { useSelection } from '../../hooks/useSelection';
import { useStableCallback } from '../../hooks/useStableCallback';
import {
  useHoverGeometry,
  type HoverGeometryHandlers,
} from './hooks';

interface UseGraphViewInteractionOptions {
  data: GraphData;
  onSelectionChange?: (selection: Selection) => void;
  onSelectionDelete?: (selection: DeleteSelection) => void;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  onNodeHover?: (node: GraphNode | null, geometry: HoverGeometry | null) => void;
  onEdgeHover?: (edge: GraphEdge | null, geometry: HoverGeometry | null) => void;
  onAnnotationHover?: (annotationId: string | null) => void;
  nodeHoverAnchor?: HoverAnchorPosition;
  edgeHoverAnchor?: HoverAnchorPosition;
  clearHoverOnViewportChange?: boolean;
}

interface GraphViewInteractionState {
  handleSelectionChange: ReturnType<typeof useSelection>['handleSelectionChange'];
  graphSurfaceRef: React.RefObject<HTMLDivElement | null>;
  hoverHandlers: HoverGeometryHandlers;
  handleNodeClick: (event: React.MouseEvent, node: Node) => void;
  handleEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  handleBeforeDelete: (params: { nodes: Node[]; edges: Edge[] }) => Promise<boolean>;
}

export function useGraphViewInteraction({
  data,
  onSelectionChange,
  onSelectionDelete,
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  onEdgeHover,
  onAnnotationHover,
  nodeHoverAnchor = 'topCenter',
  edgeHoverAnchor = 'midpoint',
  clearHoverOnViewportChange,
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
    clearHoverOnViewportChange,
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

  const stableOnSelectionDelete = useStableCallback(onSelectionDelete);

  /*
   * Report the delete gesture and then veto it. The view's nodes and edges mirror the
   * `data` prop, so letting ReactFlow drop them from its own state would leave the two
   * out of step until the next `data` change put them back. The client removes them
   * from `data` instead, which is also what makes the removal undoable on its side.
   */
  const handleBeforeDelete = useCallback(
    // eslint-disable-next-line sonarjs/no-invariant-returns -- always vetoing is the contract
    async ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }): Promise<boolean> => {
      if (!stableOnSelectionDelete) return false;
      const graphNodeIds = nodes
        .filter((node) => !isAnnotationNode(node as FlowNode))
        .map((node) => node.id);
      const edgeIds = edges.map((edge) => edge.id);
      if (graphNodeIds.length || edgeIds.length) {
        stableOnSelectionDelete({ nodes: graphNodeIds, edges: edgeIds });
      }
      return false;
    },
    [stableOnSelectionDelete],
  );

  return {
    handleSelectionChange,
    graphSurfaceRef,
    hoverHandlers,
    handleNodeClick,
    handleEdgeClick,
    handleBeforeDelete,
  };
}
