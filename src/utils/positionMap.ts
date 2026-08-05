import type { FlowNode, FlowGraphNode, NodePositionMap, FitViewPadding } from '../types';
import { isAnnotationNode } from './annotationTransform';

export function flowGraphNodesToPositionMap(nodes: FlowGraphNode[]): NodePositionMap {
  const positions: NodePositionMap = {};
  for (const node of nodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  }
  return positions;
}

export function flowNodesToPositionMap(
  nodes: FlowNode[],
  { excludeAnnotations = true } = {},
): NodePositionMap {
  const positions: NodePositionMap = {};
  for (const flowNode of nodes) {
    if (excludeAnnotations && isAnnotationNode(flowNode)) continue;
    positions[flowNode.id] = { x: flowNode.position.x, y: flowNode.position.y };
  }
  return positions;
}

export function getFitViewPaddingKey(padding: FitViewPadding): string {
  return typeof padding === 'number' ? String(padding) : JSON.stringify(padding);
}
