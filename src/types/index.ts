import type { Node, Edge } from '@xyflow/react';

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
export type LayoutType = 'hierarchical' | 'hierarchicalLR' | 'force' | 'grid';

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
}

export interface GraphEdgeData extends Record<string, unknown> {
  label: string;
  graphEdge: GraphEdge;
  selected?: boolean;
}

// ReactFlow typed nodes and edges
export type FlowNode = Node<GraphNodeData, 'graphNode'>;
export type FlowEdge = Edge<GraphEdgeData>;

// Component props
export interface GraphViewProps {
  data: GraphData;
  layout?: LayoutType;
  onSelectionChange?: (selection: Selection) => void;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  selectedIds?: string[];
  className?: string;
}
