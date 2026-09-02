import type {
  GraphData,
  GraphNode,
  GraphEdge,
  FlowGraphNode,
  FlowEdge,
  GraphNodeData,
  GraphEdgeData,
  EdgeType,
  NodePositionMap,
} from '../types';
import { simplifyTypeName, getPrimaryType } from './colorGenerator';
import { capitalizeAllWords } from './utils';

/**
 * Node dimensions handed to the layout engine.
 *
 * These must track what GraphNode.module.scss actually paints, because ELK
 * spaces nodes by their bounding boxes: a box wider or taller than the rendered
 * node turns into gaps nobody asked for. The height is fixed by the 24px icon
 * plus 4px of vertical padding; `NODE_WIDTH` is the fallback used when a label
 * is unavailable, with `estimateNodeWidth` covering the normal case.
 */
export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 32;

/** Matches min-width / max-width on `.node`. */
export const NODE_MIN_WIDTH = 60;
export const NODE_MAX_WIDTH = 200;

/**
 * Non-text width of a node: 8px horizontal padding on each side, the 24px icon,
 * and 4px of label padding on each side.
 */
const NODE_CHROME_WIDTH = 48;

/**
 * Approximate advance width per character at the label's 12px/800 font. Mixed
 * case runs narrower than the all-caps labels used for genes and proteins.
 */
const CHAR_WIDTH = 6.9;
const CHAR_WIDTH_UPPERCASE = 8;

/** Types whose labels GraphNode renders in all caps. */
const UPPERCASE_TYPES = new Set(['Gene', 'Protein']);

/**
 * The label text as GraphNode renders it. Shared so that width estimates and
 * the rendered node cannot drift apart.
 */
export function getNodeDisplayLabel(label: string, primaryType: string): string {
  return UPPERCASE_TYPES.has(primaryType) ? label.toUpperCase() : capitalizeAllWords(label);
}

/**
 * Estimated rendered width of a node, clamped to the same bounds the
 * stylesheet enforces. Used as the node's layout box so that the configured
 * spacing is the gap the user actually sees.
 */
export function estimateNodeWidth(label: string, primaryType: string): number {
  if (!label) return NODE_WIDTH;
  const text = getNodeDisplayLabel(label, primaryType);
  const charWidth = UPPERCASE_TYPES.has(primaryType) ? CHAR_WIDTH_UPPERCASE : CHAR_WIDTH;
  const width = NODE_CHROME_WIDTH + text.length * charWidth;
  return Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, Math.round(width)));
}

/**
 * Convert GraphData to ReactFlow nodes
 */
export function transformNodesToFlow(
  data: GraphData,
  nodePositions?: NodePositionMap,
): FlowGraphNode[] {
  return Object.values(data.nodes).map((node) => {
    const primaryType = getPrimaryType(node.types);
    const label = node.names[0] || node.id;

    const nodeData: GraphNodeData = {
      label,
      graphNode: node,
      primaryType: simplifyTypeName(primaryType),
    };

    return {
      id: node.id,
      type: 'graphNode',
      position: nodePositions?.[node.id] ?? { x: 0, y: 0 },
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
