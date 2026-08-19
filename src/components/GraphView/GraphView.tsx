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
import {
  GraphSettingsContext,
  DEFAULT_DIMMED_OPACITY,
} from '../../hooks/useGraphSettings';
import { AnnotationActionsContext } from '../../hooks/useAnnotationActions';
import { NodeChromeContext } from '../../hooks/useNodeChrome';
import { GraphNode } from '../nodes';
import { GraphEdge } from '../edges';
import { GraphAnnotationNode } from '../annotations';
import { useGraphViewState } from './useGraphViewState';
import { GraphFocusHandler } from './GraphFocusHandler';
import { CustomLayoutFitHandler } from './CustomLayoutFitHandler';
import { DEFAULT_FIT_VIEW_PADDING } from './constants';
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

const minimapNodeColor = '#888';

function getMinimapNodeColor(node: Node): string {
  return node.type === ANNOTATION_NODE_TYPE ? 'transparent' : minimapNodeColor;
}

interface GraphViewInnerProps extends GraphViewProps {
  initialNodes: FlowGraphNode[];
  initialEdges: FlowEdge[];
}

function GraphViewInner(props: GraphViewInnerProps) {
  const {
    className,
    showMiniMap = true,
    showHandles = true,
    focusRequest,
    fitViewPadding = DEFAULT_FIT_VIEW_PADDING,
    layout,
    viewportSyncKey,
  } = props;
  const {
    isLayouting,
    nodes,
    edges,
    layoutKey,
    onNodesChange,
    onEdgesChange,
    handleSelectionChange,
    handleNodeDragStop,
    annotationActions,
    settings,
    nodeChromeValue,
    graphSurfaceRef,
    hoverHandlers,
    handleNodeClick,
    handleEdgeClick,
    consumedFocusTokenRef,
  } = useGraphViewState(props);

  const fitViewOptions = useMemo(
    () => ({ padding: fitViewPadding }),
    [fitViewPadding],
  );

  const surfaceStyle = useMemo(() => {
    const opacity = settings.hoverStyles?.dimmedOpacity ?? DEFAULT_DIMMED_OPACITY;
    return {
      '--tgv-dimmed-opacity': String(opacity),
    } as React.CSSProperties;
  }, [settings.hoverStyles?.dimmedOpacity]);

  if (isLayouting) {
    return <div className={styles.loading}>Computing layout...</div>;
  }

  return (
    <AnnotationActionsContext.Provider value={annotationActions}>
      <GraphSettingsContext.Provider value={settings}>
        <NodeChromeContext.Provider value={nodeChromeValue}>
          <div
            ref={graphSurfaceRef}
            className={styles.graphSurface}
            style={surfaceStyle}
          >
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
              nodesConnectable={showHandles}
              selectionOnDrag
              selectionMode={SelectionMode.Partial}
              selectNodesOnDrag
              panOnDrag={panOnDrag}
              panOnScroll
              zoomOnScroll
              multiSelectionKeyCode="Shift"
              fitView={layout !== 'custom'}
              fitViewOptions={fitViewOptions}
              minZoom={0.15}
              maxZoom={3}
              className={cn(styles.graphView, !showHandles && styles.handlesHidden, className)}
              proOptions={proOptions}
            >
              <GraphFocusHandler
                focusRequest={focusRequest}
                consumedTokenRef={consumedFocusTokenRef}
              />
              <CustomLayoutFitHandler
                layout={layout}
                fitViewPadding={fitViewPadding}
                viewportSyncKey={viewportSyncKey}
                layoutKey={layoutKey}
                focusRequest={focusRequest}
                consumedFocusTokenRef={consumedFocusTokenRef}
              />
              <Background color="#ddd" gap={20} />
              <Controls fitViewOptions={fitViewOptions} />
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
        </NodeChromeContext.Provider>
      </GraphSettingsContext.Provider>
    </AnnotationActionsContext.Provider>
  );
}

export function GraphView(props: GraphViewProps) {
  const { data, edgeType, showEdgeLabels = true, layout, nodePositions } = props;

  if (process.env.NODE_ENV !== 'production' && layout === 'custom' && !nodePositions) {
    console.warn('GraphView: nodePositions is required when layout is "custom".');
  }

  const nodePositionsKey = useMemo(
    () => (layout === 'custom' && nodePositions ? JSON.stringify(nodePositions) : ''),
    [layout, nodePositions],
  );

  const initialNodes = useMemo(
    () => transformNodesToFlow(data, nodePositionsKey ? nodePositions : undefined),
    [data, nodePositions, nodePositionsKey],
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
