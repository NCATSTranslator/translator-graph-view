import type {
  GraphData,
  GraphNode,
  GraphEdge,
  FlowNode,
  FlowEdge,
  GraphNodeData,
  GraphEdgeData,
} from '../types';
import { getColorForType, simplifyTypeName, getPrimaryType } from './colorGenerator';

// Default node dimensions
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 60;

/**
 * Convert GraphData to ReactFlow nodes
 */
export function transformNodesToFlow(data: GraphData): FlowNode[] {
  return Object.values(data.nodes).map((node) => {
    const primaryType = getPrimaryType(node.types);
    const color = getColorForType(primaryType);
    const label = node.names[0] || node.id;

    const nodeData: GraphNodeData = {
      label,
      graphNode: node,
      primaryType: simplifyTypeName(primaryType),
      color,
    };

    return {
      id: node.id,
      type: 'graphNode',
      position: { x: 0, y: 0 }, // Will be set by layout
      data: nodeData,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });
}

/**
 * Convert GraphData to ReactFlow edges
 */
export function transformEdgesToFlow(data: GraphData): FlowEdge[] {
  return Object.values(data.edges).map((edge) => {
    const edgeData: GraphEdgeData = {
      label: formatPredicate(edge.predicate),
      graphEdge: edge,
    };

    return {
      id: edge.id,
      source: edge.subject,
      target: edge.object,
      type: 'graphEdge',
      data: edgeData,
    };
  });
}

/**
 * Format a predicate for display
 * Converts "biolink:treats" to "treats"
 */
export function formatPredicate(predicate: string): string {
  if (predicate.startsWith('biolink:')) {
    return predicate.replace('biolink:', '').replace(/_/g, ' ');
  }
  const colonIndex = predicate.indexOf(':');
  if (colonIndex !== -1) {
    return predicate.substring(colonIndex + 1).replace(/_/g, ' ');
  }
  return predicate.replace(/_/g, ' ');
}

/**
 * Get nodes by their IDs from GraphData
 */
export function getNodesById(data: GraphData, ids: string[]): GraphNode[] {
  return ids
    .map((id) => data.nodes[id])
    .filter((node): node is GraphNode => node !== undefined);
}

/**
 * Get edges by their IDs from GraphData
 */
export function getEdgesById(data: GraphData, ids: string[]): GraphEdge[] {
  return ids
    .map((id) => data.edges[id])
    .filter((edge): edge is GraphEdge => edge !== undefined);
}
