import type {
  GraphData,
  GraphNode,
  GraphEdge,
  FlowNode,
  FlowEdge,
  GraphNodeData,
  GraphEdgeData,
  EdgeType,
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
    };
  });
}

/**
 * Build a normalized key for a source-target pair so that
 * (A,B) and (B,A) are treated as the same pair.
 */
function pairKey(source: string, target: string): string {
  return source < target ? `${source}::${target}` : `${target}::${source}`;
}

/**
 * Convert GraphData to ReactFlow edges.
 * Groups edges that share the same node pair and assigns each an index
 * so the renderer can spread them into distinct curves.
 */
export function transformEdgesToFlow(
  data: GraphData,
  edgeType?: EdgeType,
  showLabels?: boolean,
): FlowEdge[] {
  const edges = Object.values(data.edges);

  // Count how many edges share each node pair
  const pairCounts = new Map<string, number>();
  const pairIndices = new Map<string, number>();
  for (const edge of edges) {
    const key = pairKey(edge.subject, edge.object);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  return edges.map((edge) => {
    const key = pairKey(edge.subject, edge.object);
    const totalCount = pairCounts.get(key) ?? 1;
    const index = pairIndices.get(key) ?? 0;
    pairIndices.set(key, index + 1);

    const edgeData: GraphEdgeData = {
      label: formatPredicate(edge.predicate),
      graphEdge: edge,
      edgeType,
      showLabel: showLabels,
      inferred: edge.inferred,
      edgeIndex: totalCount > 1 ? index : undefined,
      edgeTotalCount: totalCount > 1 ? totalCount : undefined,
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
