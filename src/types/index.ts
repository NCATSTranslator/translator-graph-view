import type { ReactNode } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { Padding } from '@xyflow/system';

// Core data types from input schema
export interface GraphData {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  results?: Result[];
  paths?: Record<string, Path>;
  publications?: Record<string, Publication>;
  trials?: Record<string, Trial>;
}

export interface GraphNode {
  id: string;
  names: string[];
  types: string[];
  curies?: string[];
}

export interface GraphEdge {
  id: string;
  subject: string;
  object: string;
  predicate: string;
  predicate_url?: string;
  knowledge_level?: string;
  inferred?: boolean;
  provenance?: Provenance[];
  publications?: { inferred?: Publication[] };
  trials?: Trial[];
  support?: unknown[];
  aras?: string[];
  description?: string;
}

export interface Result {
  id: string;
  drug_name?: string;
  subject: string;
  object: string;
  paths?: string[];
}

export interface Path {
  id: string;
  edges: string[];
}

export interface Publication {
  id: string;
  title?: string;
  authors?: string[];
  year?: number;
  journal?: string;
  pmid?: string;
  doi?: string;
}

export interface Trial {
  id: string;
  title?: string;
  status?: string;
  phase?: string;
  nctid?: string;
}

export interface Provenance {
  source?: string;
  url?: string;
  evidence_type?: string;
}

// Layout types
export type LayoutType = 'hierarchical' | 'hierarchicalLR' | 'force' | 'grid' | 'radial' | 'custom';

export type NodePosition = { x: number; y: number };

export type NodePositionMap = Record<string, NodePosition>;

// Edge path types
export type EdgeType = 'bezier' | 'straight' | 'step' | 'smoothstep';

// Selection types
export interface Selection {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ReactFlow node/edge data types
export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  graphNode: GraphNode;
  primaryType: string;
  color: string;
  selected?: boolean;
  hovered?: boolean;
}

export interface GraphEdgeData extends Record<string, unknown> {
  label: string;
  graphEdge: GraphEdge;
  edgeType?: EdgeType;
  showLabel?: boolean;
  selected?: boolean;
  inferred?: boolean;
  edgeIndex?: number;
  edgeTotalCount?: number;
  hovered?: boolean;
}

// Annotation types
export interface GraphAnnotation {
  id: string;
  text: string;
  position: { x: number; y: number };
}

export interface GraphAnnotationStyles {
  backgroundColor?: string;
  className?: string;
  deleteButton?: {
    backgroundColor?: string;
    className?: string;
    icon?: ReactNode;
  };
}

export interface GraphAnnotationData extends Record<string, unknown> {
  text: string;
  annotation: GraphAnnotation;
}

// ReactFlow typed nodes and edges
export type FlowGraphNode = Node<GraphNodeData, 'graphNode'>;
export type FlowAnnotationNode = Node<GraphAnnotationData, 'graphAnnotation'>;
export type FlowNode = FlowGraphNode | FlowAnnotationNode;
export type FlowEdge = Edge<GraphEdgeData>;

// Hover geometry types
export type HoverAnchorPosition =
  | 'topLeft'    | 'topCenter'    | 'topRight'
  | 'centerLeft' | 'center'       | 'centerRight'
  | 'bottomLeft' | 'bottomCenter' | 'bottomRight'
  | 'midpoint';

export interface HoverGeometry {
  /** Bounding rect of the hovered element in viewport (client) coordinates. */
  rect: { x: number; y: number; width: number; height: number };
  /** The anchor point (in viewport coords) corresponding to the requested HoverAnchorPosition. */
  anchor: { x: number; y: number };
  /** Which anchor position was used to compute `anchor`. */
  anchorPosition: HoverAnchorPosition;
}

/** Imperative viewport focus request; `token` must change on each request. */
export interface GraphFocusRequest {
  nodeId: string;
  token: number;
}

export type FitViewPadding = Padding;

// Component props
export interface GraphViewProps {
  data: GraphData;
  layout?: LayoutType;
  /** Required when `layout` is `'custom'`. Graph-space coordinates for each node id. */
  nodePositions?: NodePositionMap;
  /** Padding when framing the graph via fitView. Default 0.1. */
  fitViewPadding?: FitViewPadding;
  /** Re-frame the viewport when this key changes (e.g. canvas id). */
  viewportSyncKey?: string;
  edgeType?: EdgeType;
  showEdgeLabels?: boolean;
  elkWorkerUrl: string;
  /** Fires when a graph node (not annotation) finishes dragging. Includes all graph-node positions from the current view. */
  onGraphNodeDragStop?: (nodeId: string, position: NodePosition, allPositions: NodePositionMap) => void;
  /** Fires after layout positions are applied: ELK layouts when computation finishes, custom layout when `nodePositions` sync. */
  onLayoutComplete?: (positions: NodePositionMap) => void;
  onSelectionChange?: (selection: Selection) => void;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  onNodeHover?: (node: GraphNode | null, geometry: HoverGeometry | null) => void;
  onEdgeHover?: (edge: GraphEdge | null, geometry: HoverGeometry | null) => void;
  hoveredNodeId?: string | null;
  hoveredEdgeId?: string | null;
  nodeHoverAnchor?: HoverAnchorPosition;
  edgeHoverAnchor?: HoverAnchorPosition;
  selectedIds?: string[];
  /** Pan/zoom the viewport to frame `nodeId`. Re-triggers when `token` changes. */
  focusRequest?: GraphFocusRequest | null;
  multiEdgeSpacing?: number;
  /** Controlled annotation overlays (graph-space coordinates). */
  annotations?: GraphAnnotation[];
  /** Fires when an annotation is dragged, edited, or deleted. */
  onAnnotationsChange?: (annotations: GraphAnnotation[]) => void;
  /** Client-configurable annotation appearance. */
  annotationStyles?: GraphAnnotationStyles;
  /** Show the zoomable/pannable minimap. */
  showMiniMap?: boolean;
  className?: string;
}
