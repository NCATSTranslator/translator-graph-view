import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GraphView,
  type GraphData,
  type LayoutType,
  type Selection,
  type GraphNodeType,
  type GraphEdgeType,
  type HoverGeometry,
} from '../src';
import { smallGraph, mediumGraph } from './sampleData';

type DatasetKey = 'small' | 'medium' | 'large';

const DATASETS: Array<{ label: string; key: DatasetKey }> = [
  { label: 'Small', key: 'small' },
  { label: 'Medium', key: 'medium' },
  { label: 'Large', key: 'large' },
];

const ELK_WORKER_URL = new URL('elkjs/lib/elk-worker.min.js', import.meta.url).href;

const TOOLTIP_OFFSET = { x: 12, y: 12 };

const LAYOUTS: Array<{ label: string; type: LayoutType }> = [
  { label: 'Top ↓ Bottom', type: 'hierarchical' },
  { label: 'Left → Right', type: 'hierarchicalLR' },
  { label: 'Force', type: 'force' },
  { label: 'Grid', type: 'grid' },
  { label: 'Radial', type: 'radial' },
];

function App() {
  const [largeData, setLargeData] = useState<GraphData | null>(null);
  const [dataset, setDataset] = useState<DatasetKey>('large');
  const [layout, setLayout] = useState<LayoutType>('hierarchical');
  const [selection, setSelection] = useState<Selection>({ nodes: [], edges: [] });
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNodeType | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdgeType | null>(null);
  const [sidebarHoveredNodeId, setSidebarHoveredNodeId] = useState<string | null>(null);
  const [sidebarHoveredEdgeId, setSidebarHoveredEdgeId] = useState<string | null>(null);
  const [tooltipNode, setTooltipNode] = useState<GraphNodeType | null>(null);
  const [tooltipEdge, setTooltipEdge] = useState<GraphEdgeType | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverGeometry, setHoverGeometry] = useState<HoverGeometry | null>(null);
  const nodeTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const edgeTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hoveredNodeRef = useRef(hoveredNode);
  hoveredNodeRef.current = hoveredNode;
  const hoveredEdgeRef = useRef(hoveredEdge);
  hoveredEdgeRef.current = hoveredEdge;

  useEffect(() => {
    clearTimeout(nodeTooltipTimerRef.current);
    if (hoveredNode) {
      nodeTooltipTimerRef.current = setTimeout(() => setTooltipNode(hoveredNodeRef.current), 250);
    } else {
      setTooltipNode(null);
    }
    return () => clearTimeout(nodeTooltipTimerRef.current);
  }, [hoveredNode]);

  useEffect(() => {
    clearTimeout(edgeTooltipTimerRef.current);
    if (hoveredEdge) {
      edgeTooltipTimerRef.current = setTimeout(() => setTooltipEdge(hoveredEdgeRef.current), 250);
    } else {
      setTooltipEdge(null);
    }
    return () => clearTimeout(edgeTooltipTimerRef.current);
  }, [hoveredEdge]);

  useEffect(() => {
    fetch('./example.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load example.json');
        return res.json();
      })
      .then((json) => {
        if (!json.nodes || !json.edges) {
          throw new Error('Invalid data: missing nodes or edges');
        }
        setLargeData(json as GraphData);
      })
      .catch((err) => {
        console.error('Error loading data:', err);
        setError(err.message);
      });
  }, []);

  const data = dataset === 'small' ? smallGraph : dataset === 'medium' ? mediumGraph : largeData;

  const handleSelectionChange = useCallback((newSelection: Selection) => {
    setSelection(newSelection);
  }, []);

  const handleNodeClick = useCallback((node: GraphNodeType) => {
    console.log('Node clicked:', node);
  }, []);

  const handleEdgeClick = useCallback((edge: GraphEdgeType) => {
    console.log('Edge clicked:', edge);
  }, []);

  const handleNodeHover = useCallback((node: GraphNodeType | null, geometry: HoverGeometry | null) => {
    setHoveredNode(node);
    setHoverGeometry(geometry);
    if (node && geometry) {
      setTooltipPos({
        x: geometry.anchor.x + TOOLTIP_OFFSET.x,
        y: geometry.anchor.y + TOOLTIP_OFFSET.y,
      });
    } else if (!node) {
      setTooltipPos(null);
    }
  }, []);

  const handleEdgeHover = useCallback((edge: GraphEdgeType | null, geometry: HoverGeometry | null) => {
    setHoveredEdge(edge);
    setHoverGeometry(geometry);
    if (edge && geometry) {
      setTooltipPos({
        x: geometry.anchor.x + TOOLTIP_OFFSET.x,
        y: geometry.anchor.y + TOOLTIP_OFFSET.y,
      });
    } else if (!edge) {
      setTooltipPos(null);
    }
  }, []);

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading graph data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.title}>Graph View</h2>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Dataset</h3>
          <div style={styles.buttonGroup}>
            {DATASETS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDataset(d.key)}
                style={{
                  ...styles.button,
                  ...(dataset === d.key ? styles.buttonActive : {}),
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Layout</h3>
          <div style={styles.buttonGroup}>
            {LAYOUTS.map((l) => (
              <button
                key={l.type}
                onClick={() => setLayout(l.type)}
                style={{
                  ...styles.button,
                  ...(layout === l.type ? styles.buttonActive : {}),
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Selection</h3>
          <div style={styles.selectionInfo}>
            <div>Nodes: {selection.nodes.length}</div>
            <div>Edges: {selection.edges.length}</div>
          </div>
          {selection.nodes.length > 0 && (
            <div style={styles.selectedItems}>
              <strong>Selected Nodes:</strong>
              <ul style={styles.list}>
                {selection.nodes.map((node) => (
                  <li
                    key={node.id}
                    style={{
                      ...styles.listItem,
                      ...(sidebarHoveredNodeId === node.id ? styles.listItemHovered : {}),
                    }}
                    onMouseEnter={() => {
                      setSidebarHoveredNodeId(node.id);
                      setHoverGeometry(null);
                    }}
                    onMouseLeave={() => setSidebarHoveredNodeId(null)}
                  >
                    {node.names[0] || node.id}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selection.edges.length > 0 && (
            <div style={styles.selectedItems}>
              <strong>Selected Edges:</strong>
              <ul style={styles.list}>
                {selection.edges.map((edge) => (
                  <li
                    key={edge.id}
                    style={{
                      ...styles.listItem,
                      ...(sidebarHoveredEdgeId === edge.id ? styles.listItemHovered : {}),
                    }}
                    onMouseEnter={() => {
                      setSidebarHoveredEdgeId(edge.id);
                      setHoverGeometry(null);
                    }}
                    onMouseLeave={() => setSidebarHoveredEdgeId(null)}
                  >
                    {edge.predicate}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Hover</h3>
          <div style={styles.selectionInfo}>
            {hoveredNode && (
              <div>Node: {hoveredNode.names[0] || hoveredNode.id}</div>
            )}
            {hoveredEdge && (
              <div>Edge: {hoveredEdge.predicate}</div>
            )}
            {hoverGeometry && (
              <div style={styles.hoverGeometryMeta}>
                <div>
                  Anchor ({hoverGeometry.anchorPosition}):{' '}
                  {Math.round(hoverGeometry.anchor.x)}, {Math.round(hoverGeometry.anchor.y)}
                </div>
                <div>
                  Bounds: {Math.round(hoverGeometry.rect.width)}×{Math.round(hoverGeometry.rect.height)}
                </div>
              </div>
            )}
            {!hoveredNode && !hoveredEdge && (
              <div style={{ color: '#adb5bd' }}>Hover over a node or edge</div>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Stats</h3>
          <div style={styles.stats}>
            <div>Total Nodes: {Object.keys(data.nodes).length}</div>
            <div>Total Edges: {Object.keys(data.edges).length}</div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Controls</h3>
          <ul style={styles.controlsList}>
            <li>Click: Select node/edge</li>
            <li>Shift+Click: Multi-select</li>
            <li>Drag: Pan view</li>
            <li>Scroll: Zoom in/out</li>
            <li>Box select: Drag from empty area</li>
          </ul>
        </div>
      </div>

      <div style={styles.graphContainer}>
        <GraphView
          data={data}
          layout={layout}
          elkWorkerUrl={ELK_WORKER_URL}
          onSelectionChange={handleSelectionChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeHover={handleNodeHover}
          onEdgeHover={handleEdgeHover}
          hoveredNodeId={sidebarHoveredNodeId}
          hoveredEdgeId={sidebarHoveredEdgeId}
          nodeHoverAnchor="topCenter"
          edgeHoverAnchor="midpoint"
          showEdgeLabels={false}
        />
        {(tooltipNode || tooltipEdge) && tooltipPos && (
          <div
            style={{
              ...styles.tooltip,
              left: tooltipPos.x,
              top: tooltipPos.y,
            }}
          >
            {tooltipNode && (
              <span><strong>Node:</strong> {tooltipNode.names[0] || tooltipNode.id}</span>
            )}
            {tooltipEdge && (
              <span><strong>Edge:</strong> {tooltipEdge.predicate}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    width: '100%',
    height: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  sidebar: {
    width: '280px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #dee2e6',
    overflowY: 'auto',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '20px',
    color: '#212529',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  button: {
    padding: '8px 12px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: '#495057',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  buttonActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
    color: 'white',
  },
  selectionInfo: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    fontSize: '13px',
    color: '#495057',
  },
  selectedItems: {
    marginTop: '12px',
    fontSize: '12px',
    color: '#495057',
  },
  list: {
    listStyle: 'none',
    margin: '8px 0 0 0',
    padding: 0,
  },
  listItem: {
    padding: '4px 8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    marginBottom: '4px',
    fontSize: '11px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'default',
    transition: 'background-color 0.15s ease',
  },
  listItemHovered: {
    backgroundColor: '#d0d4da',
  },
  stats: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    fontSize: '13px',
    color: '#495057',
  },
  controlsList: {
    fontSize: '12px',
    color: '#6c757d',
    paddingLeft: '16px',
    margin: 0,
    lineHeight: 1.8,
  },
  graphContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  hoverGeometryMeta: {
    marginTop: '8px',
    fontSize: '11px',
    color: '#868e96',
    lineHeight: 1.5,
  },
  tooltip: {
    position: 'fixed',
    backgroundColor: 'rgba(33, 37, 41, 0.85)',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 1000,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    color: '#6c757d',
    fontSize: '16px',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    color: '#dc3545',
    fontSize: '16px',
  },
};

export default App;
