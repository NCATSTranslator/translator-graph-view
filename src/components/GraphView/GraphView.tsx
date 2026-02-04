import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  SelectionMode,
  type NodeTypes,
  type EdgeTypes,
  type OnSelectionChangeParams,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { GraphViewProps, FlowNode, FlowEdge, GraphNodeData } from '../../types';
import { transformNodesToFlow, transformEdgesToFlow } from '../../utils';
import { useGraphLayout } from '../../hooks/useGraphLayout';
import { useSelection } from '../../hooks/useSelection';
import { GraphNode } from '../nodes';
import { GraphEdge } from '../edges';
import styles from './GraphView.module.scss';

const nodeTypes: NodeTypes = {
  graphNode: GraphNode,
};

const edgeTypes: EdgeTypes = {
  graphEdge: GraphEdge,
};

const defaultEdgeOptions = {
  type: 'graphEdge',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#888',
  },
};

interface GraphViewInnerProps extends GraphViewProps {
  initialNodes: FlowNode[];
  initialEdges: FlowEdge[];
}

function GraphViewInner({
  data,
  layout = 'hierarchical',
  onSelectionChange,
  onNodeClick,
  onEdgeClick,
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
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const { handleSelectionChange } = useSelection({
    data,
    onSelectionChange,
  });

  // Update nodes and edges when layout changes
  useEffect(() => {
    if (!isLayouting && layoutedNodes.length > 0) {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      // Fit view after layout
      setTimeout(() => {
        fitView({ padding: 0.1, duration: 200 });
      }, 50);
    }
  }, [layoutedNodes, layoutedEdges, isLayouting, setNodes, setEdges, fitView]);

  // Handle controlled selection
  useEffect(() => {
    if (selectedIds) {
      const selectedSet = new Set(selectedIds);
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: selectedSet.has(node.id),
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          selected: selectedSet.has(edge.id),
        }))
      );
    }
  }, [selectedIds, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        const graphNode = data.nodes[node.id];
        if (graphNode) {
          onNodeClick(graphNode);
        }
      }
    },
    [data, onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        const graphEdge = data.edges[edge.id];
        if (graphEdge) {
          onEdgeClick(graphEdge);
        }
      }
    },
    [data, onEdgeClick]
  );

  const onSelectionChangeHandler = useCallback(
    (params: OnSelectionChangeParams) => {
      handleSelectionChange(params);
    },
    [handleSelectionChange]
  );

  const minimapNodeColor = useCallback((node: Node) => {
    const nodeData = node.data as GraphNodeData | undefined;
    return nodeData?.color || '#888';
  }, []);

  if (isLayouting) {
    return <div className={styles.loading}>Computing layout...</div>;
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      onSelectionChange={onSelectionChangeHandler}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      selectionOnDrag
      selectionMode={SelectionMode.Partial}
      selectNodesOnDrag
      panOnDrag={[1, 2]}
      panOnScroll
      zoomOnScroll
      multiSelectionKeyCode="Shift"
      fitView
      fitViewOptions={{ padding: 0.1 }}
      className={`${styles.graphView} ${className || ''}`}
      proOptions={{hideAttribution: true }}
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
  );
}

export function GraphView(props: GraphViewProps) {
  const { data } = props;

  const initialNodes = useMemo(() => transformNodesToFlow(data), [data]);
  const initialEdges = useMemo(() => transformEdgesToFlow(data), [data]);

  return (
    <ReactFlowProvider>
      <GraphViewInner
        {...props}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    </ReactFlowProvider>
  );
}
