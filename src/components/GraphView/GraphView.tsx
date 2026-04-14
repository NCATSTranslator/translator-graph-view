import { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { GraphViewProps, FlowNode, FlowEdge, GraphNodeData, GraphEdgeData } from '../../types';
import { transformNodesToFlow, transformEdgesToFlow } from '../../utils';
import { useGraphLayout } from '../../hooks/useGraphLayout';
import { useSelection } from '../../hooks/useSelection';
import { GraphSettingsContext, type GraphSettings } from '../../hooks/useGraphSettings';
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

  // Update nodes and edges when layout changes
  useEffect(() => {
    if (!isLayouting && layoutedNodes.length > 0) {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      // Fit view after layout
      const timer = setTimeout(() => {
        fitView({ padding: 0.1, duration: 200 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [layoutedNodes, layoutedEdges, isLayouting, setNodes, setEdges, fitView]);

  // Handle controlled selection
  const prevSelectedIdsRef = useRef<string[] | undefined>(undefined);

  useEffect(() => {
    if (!selectedIds) return;
    const prev = prevSelectedIdsRef.current;
    if (prev && prev.length === selectedIds.length && prev.every((id, i) => id === selectedIds[i])) return;
    prevSelectedIdsRef.current = selectedIds;

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
  }, [selectedIds, setNodes, setEdges]);

  // Handle controlled hover — only touch the items whose hovered flag actually changes
  const prevHoveredNodeIdRef = useRef<string | null | undefined>(undefined);
  const prevHoveredEdgeIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const prev = prevHoveredNodeIdRef.current;
    if (prev === hoveredNodeId) return;
    prevHoveredNodeIdRef.current = hoveredNodeId;
    setNodes((nds) =>
      nds.map((node) => {
        const shouldHover = node.id === hoveredNodeId;
        const wasHovered = node.id === prev;
        if (!shouldHover && !wasHovered) return node;
        return { ...node, data: { ...node.data, hovered: shouldHover } as GraphNodeData };
      })
    );
  }, [hoveredNodeId, setNodes]);

  useEffect(() => {
    const prev = prevHoveredEdgeIdRef.current;
    if (prev === hoveredEdgeId) return;
    prevHoveredEdgeIdRef.current = hoveredEdgeId;
    setEdges((eds) =>
      eds.map((edge) => {
        const shouldHover = edge.id === hoveredEdgeId;
        const wasHovered = edge.id === prev;
        if (!shouldHover && !wasHovered) return edge;
        return { ...edge, data: { ...edge.data, hovered: shouldHover } as GraphEdgeData };
      })
    );
  }, [hoveredEdgeId, setEdges]);

  // Stable ref for data so event callbacks don't rebind on every data change
  const dataRef = useRef(data);
  dataRef.current = data;

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        const graphNode = dataRef.current.nodes[node.id];
        if (graphNode) {
          onNodeClick(graphNode);
        }
      }
    },
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        const graphEdge = dataRef.current.edges[edge.id];
        if (graphEdge) {
          onEdgeClick(graphEdge);
        }
      }
    },
    [onEdgeClick]
  );

  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeHover) {
        const graphNode = dataRef.current.nodes[node.id];
        if (graphNode) {
          onNodeHover(graphNode);
        }
      }
    },
    [onNodeHover]
  );

  const handleNodeMouseLeave = useCallback(
    () => {
      if (onNodeHover) {
        onNodeHover(null);
      }
    },
    [onNodeHover]
  );

  const handleEdgeMouseEnter = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (onEdgeHover) {
        const graphEdge = dataRef.current.edges[edge.id];
        if (graphEdge) {
          onEdgeHover(graphEdge);
        }
      }
    },
    [onEdgeHover]
  );

  const handleEdgeMouseLeave = useCallback(
    () => {
      if (onEdgeHover) {
        onEdgeHover(null);
      }
    },
    [onEdgeHover]
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
