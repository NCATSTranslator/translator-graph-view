import type { GraphViewProps, FlowEdge, FlowGraphNode } from '../../types';
import type { AnnotationActions } from '../../hooks/useAnnotationActions';
import type { GraphSettings } from '../../hooks/useGraphSettings';
import type { HoverGeometryHandlers } from './hooks';
import { useGraphViewNodeState } from './useGraphViewNodeState';
import { useGraphViewInteraction } from './useGraphViewInteraction';

interface UseGraphViewStateOptions extends GraphViewProps {
  initialNodes: FlowGraphNode[];
  initialEdges: FlowEdge[];
}

export interface GraphViewState {
  isLayouting: boolean;
  nodes: ReturnType<typeof useGraphViewNodeState>['nodes'];
  edges: ReturnType<typeof useGraphViewNodeState>['edges'];
  onNodesChange: ReturnType<typeof useGraphViewNodeState>['onNodesChange'];
  onEdgesChange: ReturnType<typeof useGraphViewNodeState>['onEdgesChange'];
  handleSelectionChange: ReturnType<typeof useGraphViewInteraction>['handleSelectionChange'];
  handleNodeDragStop: ReturnType<typeof useGraphViewNodeState>['handleNodeDragStop'];
  annotationActions: AnnotationActions;
  settings: GraphSettings;
  graphSurfaceRef: ReturnType<typeof useGraphViewInteraction>['graphSurfaceRef'];
  hoverHandlers: HoverGeometryHandlers;
  handleNodeClick: ReturnType<typeof useGraphViewInteraction>['handleNodeClick'];
  handleEdgeClick: ReturnType<typeof useGraphViewInteraction>['handleEdgeClick'];
}

export function useGraphViewState(options: UseGraphViewStateOptions): GraphViewState {
  const nodeState = useGraphViewNodeState(options);
  const interaction = useGraphViewInteraction(options);

  return { ...nodeState, ...interaction };
}
