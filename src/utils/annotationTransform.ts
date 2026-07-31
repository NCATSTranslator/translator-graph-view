import type { GraphAnnotation, FlowNode, FlowAnnotationNode, FlowGraphNode } from '../types';

export const ANNOTATION_NODE_TYPE = 'graphAnnotation' as const;
export const ANNOTATION_Z_INDEX = 1000;

export function isAnnotationNode(node: FlowNode): node is FlowAnnotationNode {
  return node.type === ANNOTATION_NODE_TYPE;
}

export function isGraphNode(node: FlowNode): node is FlowGraphNode {
  return node.type !== ANNOTATION_NODE_TYPE;
}

/** Drop annotations whose IDs collide with graph node IDs. */
export function filterAnnotationsCollidingWithGraphNodes(
  annotations: GraphAnnotation[],
  graphNodes: FlowNode[],
): GraphAnnotation[] {
  const graphNodeIds = new Set(
    graphNodes.filter(isGraphNode).map((node) => node.id),
  );
  return annotations.filter((annotation) => !graphNodeIds.has(annotation.id));
}

export function transformAnnotationsToFlow(
  annotations: GraphAnnotation[],
  readOnly = false,
): FlowAnnotationNode[] {
  return annotations.map((annotation) => ({
    id: annotation.id,
    type: ANNOTATION_NODE_TYPE,
    position: annotation.position,
    data: {
      text: annotation.text,
      annotation,
    },
    draggable: !readOnly,
    selectable: false,
    zIndex: ANNOTATION_Z_INDEX,
  }));
}

export function extractAnnotationsFromFlow(nodes: FlowNode[]): GraphAnnotation[] {
  return nodes
    .filter(isAnnotationNode)
    .map((node) => ({
      id: node.id,
      text: node.data.text,
      position: { ...node.position },
    }));
}

export function mergeGraphAndAnnotationNodes(
  graphNodes: FlowGraphNode[],
  annotations: GraphAnnotation[] | undefined,
  readOnly: boolean,
): FlowNode[] {
  const safeAnnotations = filterAnnotationsCollidingWithGraphNodes(
    annotations ?? [],
    graphNodes,
  );
  return [...graphNodes, ...transformAnnotationsToFlow(safeAnnotations, readOnly)];
}

function getLayoutKey(nodes: FlowGraphNode[]): string {
  return nodes.map((n) => `${n.id}:${n.position.x},${n.position.y}`).join('|');
}

function getAnnotationsKey(annotations: GraphAnnotation[] | undefined): string {
  return JSON.stringify(annotations ?? []);
}

export { getLayoutKey, getAnnotationsKey };
