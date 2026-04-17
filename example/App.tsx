import { useState, useCallback } from 'react';
import {
  GraphView,
  type GraphData,
  type LayoutType,
  type Selection,
} from '../src';
import { smallGraph, mediumGraph } from './sampleData';
import { useTooltipDelay, useExampleData, useGraphHoverState } from './hooks';
import {
  ToggleList,
  SelectionList,
  HoverPanel,
  SidebarSection,
  SelectionCounts,
} from './components';
import styles from './App.module.css';

type DatasetKey = 'small' | 'medium' | 'large';

const DATASETS: Array<{ label: string; value: DatasetKey }> = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

const LAYOUTS: Array<{ label: string; value: LayoutType }> = [
  { label: 'Top ↓ Bottom', value: 'hierarchical' },
  { label: 'Left → Right', value: 'hierarchicalLR' },
  { label: 'Force', value: 'force' },
  { label: 'Grid', value: 'grid' },
  { label: 'Radial', value: 'radial' },
];

const ELK_WORKER_URL = new URL('elkjs/lib/elk-worker.min.js', import.meta.url).href;
const TOOLTIP_OFFSET = { x: 12, y: 12 };
const TOOLTIP_DELAY = 250;

function resolveDataset(
  dataset: DatasetKey,
  largeData: GraphData | null,
): GraphData | null {
  if (dataset === 'small') return smallGraph;
  if (dataset === 'medium') return mediumGraph;
  return largeData;
}

function App() {
  const { data: largeData, error } = useExampleData();
  const [dataset, setDataset] = useState<DatasetKey>('large');
  const [layout, setLayout] = useState<LayoutType>('hierarchical');
  const [selection, setSelection] = useState<Selection>({ nodes: [], edges: [] });
  const [sidebarHoveredNodeId, setSidebarHoveredNodeId] = useState<string | null>(null);
  const [sidebarHoveredEdgeId, setSidebarHoveredEdgeId] = useState<string | null>(null);

  const hover = useGraphHoverState(TOOLTIP_OFFSET);
  const tooltipNode = useTooltipDelay(hover.hoveredNode, TOOLTIP_DELAY);
  const tooltipEdge = useTooltipDelay(hover.hoveredEdge, TOOLTIP_DELAY);

  const handleSidebarNodeHover = useCallback((id: string | null) => {
    setSidebarHoveredNodeId(id);
    if (id !== null) hover.clearGeometry();
  }, [hover]);

  const handleSidebarEdgeHover = useCallback((id: string | null) => {
    setSidebarHoveredEdgeId(id);
    if (id !== null) hover.clearGeometry();
  }, [hover]);

  if (error) return <div className={styles.container}><div className={styles.error}>Error: {error}</div></div>;

  const data = resolveDataset(dataset, largeData);
  if (!data) return <div className={styles.container}><div className={styles.loading}>Loading graph data...</div></div>;

  const selectedNodeItems = selection.nodes.map((n) => ({ id: n.id, label: n.names[0] || n.id }));
  const selectedEdgeItems = selection.edges.map((e) => ({ id: e.id, label: e.predicate }));

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2 className={styles.title}>Graph View</h2>

        <SidebarSection title="Dataset">
          <ToggleList items={DATASETS} active={dataset} onChange={setDataset} />
        </SidebarSection>

        <SidebarSection title="Layout">
          <ToggleList items={LAYOUTS} active={layout} onChange={setLayout} />
        </SidebarSection>

        <SidebarSection title="Selection">
          <SelectionCounts selection={selection} />
          <SelectionList
            title="Selected Nodes:"
            items={selectedNodeItems}
            hoveredId={sidebarHoveredNodeId}
            onHover={handleSidebarNodeHover}
          />
          <SelectionList
            title="Selected Edges:"
            items={selectedEdgeItems}
            hoveredId={sidebarHoveredEdgeId}
            onHover={handleSidebarEdgeHover}
          />
        </SidebarSection>

        <SidebarSection title="Hover">
          <HoverPanel
            hoveredNode={hover.hoveredNode}
            hoveredEdge={hover.hoveredEdge}
            hoverGeometry={hover.hoverGeometry}
          />
        </SidebarSection>

        <SidebarSection title="Stats">
          <div className={styles.stats}>
            <div>Total Nodes: {Object.keys(data.nodes).length}</div>
            <div>Total Edges: {Object.keys(data.edges).length}</div>
          </div>
        </SidebarSection>

        <SidebarSection title="Controls">
          <ul className={styles.controlsList}>
            <li>Click: Select node/edge</li>
            <li>Shift+Click: Multi-select</li>
            <li>Drag: Pan view</li>
            <li>Scroll: Zoom in/out</li>
            <li>Box select: Drag from empty area</li>
          </ul>
        </SidebarSection>
      </div>

      <div className={styles.graphContainer}>
        <GraphView
          data={data}
          layout={layout}
          elkWorkerUrl={ELK_WORKER_URL}
          onSelectionChange={setSelection}
          onNodeClick={(node) => console.log('Node clicked:', node)}
          onEdgeClick={(edge) => console.log('Edge clicked:', edge)}
          onNodeHover={hover.handleNodeHover}
          onEdgeHover={hover.handleEdgeHover}
          hoveredNodeId={sidebarHoveredNodeId}
          hoveredEdgeId={sidebarHoveredEdgeId}
          nodeHoverAnchor="topCenter"
          edgeHoverAnchor="midpoint"
          showEdgeLabels={false}
        />
        {(tooltipNode || tooltipEdge) && hover.tooltipPos && (
          <div
            // eslint-disable-next-line no-restricted-syntax
            style={{ left: hover.tooltipPos.x, top: hover.tooltipPos.y }}
            className={styles.tooltip}
          >
            {tooltipNode && <span><strong>Node:</strong> {tooltipNode.names[0] || tooltipNode.id}</span>}
            {tooltipEdge && <span><strong>Edge:</strong> {tooltipEdge.predicate}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
