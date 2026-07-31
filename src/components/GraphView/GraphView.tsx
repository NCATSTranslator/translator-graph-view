import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  SelectionMode,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { GraphViewProps, FlowEdge, FlowGraphNode } from '../../types';
import { transformNodesToFlow, transformEdgesToFlow } from '../../utils';
import { ANNOTATION_NODE_TYPE } from '../../utils/annotationTransform';
import { cn } from '../../utils/cn';
import { GraphSettingsContext } from '../../hooks/useGraphSettings';
import { AnnotationActionsContext } from '../../hooks/useAnnotationActions';
import { GraphNode } from '../nodes';
import { GraphEdge } from '../edges';
import { GraphAnnotationNode } from '../annotations';
import { useGraphViewState } from './useGraphViewState';
import { GraphFocusHandler } from './GraphFocusHandler';
import styles from './GraphView.module.scss';

const nodeTypes: NodeTypes = {
  graphNode: GraphNode,
  graphAnnotation: GraphAnnotationNode,
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

const minimapNodeColor = '#888';

function getMinimapNodeColor(node: Node): string {
  return node.type === ANNOTATION_NODE_TYPE ? 'transparent' : minimapNodeColor;
}

interface GraphViewInnerProps extends GraphViewProps {
  initialNodes: FlowGraphNode[];
  initialEdges: FlowEdge[];
}

function GraphViewInner(props: GraphViewInnerProps) {
  const { className, showMiniMap = true, focusRequest } = props;
  const {
    isLayouting,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    handleSelectionChange,
    handleNodeDragStop,
    annotationActions,
    settings,
    graphSurfaceRef,
    hoverHandlers,
    handleNodeClick,
    handleEdgeClick,
    consumedFocusTokenRef,
  } = useGraphViewState(props);

  if (isLayouting) {
    return <div className={styles.loading}>Computing layout...</div>;
  }

  return (
    <AnnotationActionsContext.Provider value={annotationActions}>
      <GraphSettingsContext.Provider value={settings}>
        <div ref={graphSurfaceRef} className={styles.graphSurface}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onNodeMouseEnter={hoverHandlers.handleNodeMouseEnter}
            onNodeMouseLeave={hoverHandlers.handleNodeMouseLeave}
            onEdgeMouseEnter={hoverHandlers.handleEdgeMouseEnter}
            onEdgeMouseLeave={hoverHandlers.handleEdgeMouseLeave}
            onNodeDragStop={handleNodeDragStop}
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
            className={cn(styles.graphView, className)}
            proOptions={proOptions}
          >
            <GraphFocusHandler
              focusRequest={focusRequest}
              consumedTokenRef={consumedFocusTokenRef}
            />
            <Background color="#ddd" gap={20} />
            <Controls />
            {showMiniMap && (
              <MiniMap
                nodeColor={getMinimapNodeColor}
                nodeStrokeWidth={3}
                zoomable
                pannable
              />
            )}
          </ReactFlow>
        </div>
      </GraphSettingsContext.Provider>
    </AnnotationActionsContext.Provider>
  );
}

export function GraphView(props: GraphViewProps) {
  const { data, edgeType, showEdgeLabels = true } = props;

  const initialNodes = useMemo(
    () => transformNodesToFlow(data),
    [data],
  );
  const initialEdges = useMemo(
    () => transformEdgesToFlow(data, edgeType, showEdgeLabels),
    [data, edgeType, showEdgeLabels],
  );

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
