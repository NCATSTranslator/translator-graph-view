import { useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnViewportChange,
  ReactFlowProvider,
  SelectionMode,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { GraphViewProps, FlowNode, FlowEdge, GraphNodeData } from '../../types';
import { transformNodesToFlow, transformEdgesToFlow } from '../../utils';
import { useGraphLayout } from '../../hooks/useGraphLayout';
import { useSelection } from '../../hooks/useSelection';
import { GraphSettingsContext, type GraphSettings } from '../../hooks/useGraphSettings';
import { GraphNode } from '../nodes';
import { GraphEdge } from '../edges';
import {
  useLayoutSync,
  useControlledSelection,
  useControlledHover,
  useHoverGeometry,
} from './hooks';
import styles from './GraphView.module.scss';

const nodeTypes: NodeTypes = {
  graphNode: GraphNode,
};

const edgeTypes: EdgeTypes = {
  graphEdge: GraphEdge,
};

const defaultEdgeOptions = {
  type: 'graphEdge',
};

const panOnDrag: number[] = [1, 2];

const proOptions = { hideAttribution: true };

const fitViewOptions = { padding: 0.1 };

interface GraphViewInnerProps extends GraphViewProps {
  initialNodes: FlowNode[];
  initialEdges: FlowEdge[];
}

function GraphViewInner({
  data,
  layout = 'hierarchical',
  elkWorkerUrl,
  onSelectionChange,
  onNodeClick,
  onEdgeClick,
  onNodeHover,
  onEdgeHover,
  hoveredNodeId,
  hoveredEdgeId,
  nodeHoverAnchor = 'topCenter',
  edgeHoverAnchor = 'midpoint',
  selectedIds,
  className,
  initialNodes,
  initialEdges,
}: GraphViewInnerProps) {
  const { fitView } = useReactFlow();

  const { nodes: layoutedNodes, edges: layoutedEdges, isLayouting } = useGraphLayout({
    nodes: initialNodes,
    edges: initialEdges,
    layout,
    elkWorkerUrl,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  const { handleSelectionChange } = useSelection({
    data,
    onSelectionChange,
  });

  useLayoutSync({ layoutedNodes, layoutedEdges, isLayouting, setNodes, setEdges, fitView });
  useControlledSelection(selectedIds, setNodes, setEdges);
  useControlledHover(hoveredNodeId, hoveredEdgeId, setNodes, setEdges);

  const dataRef = useRef(data);
  dataRef.current = data;

  const graphSurfaceRef = useRef<HTMLDivElement>(null);

  const {
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleEdgeMouseEnter,
    handleEdgeMouseLeave,
    scheduleFlush,
  } = useHoverGeometry({
    data,
    nodeHoverAnchor,
    edgeHoverAnchor,
    onNodeHover,
    onEdgeHover,
    surfaceRef: graphSurfaceRef,
  });

  useOnViewportChange({ onChange: scheduleFlush, onEnd: scheduleFlush });

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

  const minimapNodeColor = useCallback((node: Node) => {
    const nodeData = node.data as GraphNodeData | undefined;
    return nodeData?.color || '#888';
  }, []);

  if (isLayouting) {
    return <div className={styles.loading}>Computing layout...</div>;
  }

  return (
    <div ref={graphSurfaceRef} className={styles.graphSurface}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        selectNodesOnDrag
        panOnDrag={panOnDrag}
        panOnScroll
        zoomOnScroll
        multiSelectionKeyCode="Shift"
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.15}
        maxZoom={3}
        className={`${styles.graphView} ${className || ''}`}
        proOptions={proOptions}
      >
        <Background color="#ddd" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}

export function GraphView(props: GraphViewProps) {
  const { data, edgeType, showEdgeLabels = true, multiEdgeSpacing } = props;

  const initialNodes = useMemo(
    () => transformNodesToFlow(data),
    [data],
  );
  const initialEdges = useMemo(
    () => transformEdgesToFlow(data, edgeType, showEdgeLabels),
    [data, edgeType, showEdgeLabels],
  );

  const settings = useMemo<GraphSettings>(
    () => ({ multiEdgeSpacing: multiEdgeSpacing ?? 60 }),
    [multiEdgeSpacing],
  );

  return (
    <ReactFlowProvider>
      <GraphSettingsContext.Provider value={settings}>
        <GraphViewInner
          {...props}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
        />
      </GraphSettingsContext.Provider>
    </ReactFlowProvider>
  );
}
