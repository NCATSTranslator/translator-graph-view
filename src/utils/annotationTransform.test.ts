import { describe, it, expect } from 'vitest';
import type { GraphAnnotation, FlowGraphNode } from '../types';
import {
  transformAnnotationsToFlow,
  extractAnnotationsFromFlow,
  isAnnotationNode,
  filterAnnotationsCollidingWithGraphNodes,
  mergeGraphAndAnnotationNodes,
  ANNOTATION_NODE_TYPE,
  ANNOTATION_Z_INDEX,
} from './annotationTransform';

const annotations: GraphAnnotation[] = [
  { id: 'ann-1', text: 'First note', position: { x: 10, y: 20 } },
  { id: 'ann-2', text: 'Second note', position: { x: 100, y: 200 } },
];

const sampleGraphNode: FlowGraphNode = {
  id: 'node-a',
  type: 'graphNode',
  position: { x: 0, y: 0 },
  data: {
    label: 'A',
    graphNode: { id: 'node-a', names: ['A'], types: ['biolink:Drug'] },
    primaryType: 'Drug',
    color: '#000',
  },
};

describe('transformAnnotationsToFlow', () => {
  it('maps annotations to draggable flow nodes', () => {
    const flowNodes = transformAnnotationsToFlow(annotations);

    expect(flowNodes).toHaveLength(2);
    expect(flowNodes[0]).toMatchObject({
      id: 'ann-1',
      type: ANNOTATION_NODE_TYPE,
      position: { x: 10, y: 20 },
      draggable: true,
      selectable: false,
      zIndex: ANNOTATION_Z_INDEX,
      data: {
        text: 'First note',
        annotation: annotations[0],
      },
    });
  });

  it('disables drag when readOnly is true', () => {
    const [node] = transformAnnotationsToFlow(annotations, true);

    expect(node.draggable).toBe(false);
  });
});

describe('extractAnnotationsFromFlow', () => {
  it('round-trips positions and text', () => {
    const flowNodes = [...transformAnnotationsToFlow(annotations), sampleGraphNode];
    const moved = flowNodes.map((node) => (
      node.id === 'ann-1'
        ? { ...node, position: { x: 50, y: 75 } }
        : node
    ));

    expect(extractAnnotationsFromFlow(moved)).toEqual([
      { id: 'ann-1', text: 'First note', position: { x: 50, y: 75 } },
      { id: 'ann-2', text: 'Second note', position: { x: 100, y: 200 } },
    ]);
  });
});

describe('isAnnotationNode', () => {
  it('identifies annotation nodes only', () => {
    const [annotationNode] = transformAnnotationsToFlow(annotations);
    expect(isAnnotationNode(annotationNode)).toBe(true);
    expect(isAnnotationNode(sampleGraphNode)).toBe(false);
  });
});

describe('filterAnnotationsCollidingWithGraphNodes', () => {
  it('drops annotations with graph node IDs', () => {
    const colliding: GraphAnnotation[] = [
      { id: 'node-a', text: 'Collision', position: { x: 0, y: 0 } },
      { id: 'ann-safe', text: 'Safe', position: { x: 10, y: 10 } },
    ];

    expect(filterAnnotationsCollidingWithGraphNodes(colliding, [sampleGraphNode])).toEqual([
      { id: 'ann-safe', text: 'Safe', position: { x: 10, y: 10 } },
    ]);
  });
});

describe('mergeGraphAndAnnotationNodes', () => {
  it('appends annotations after graph nodes', () => {
    const merged = mergeGraphAndAnnotationNodes([sampleGraphNode], annotations, false);
    expect(merged).toHaveLength(3);
    expect(merged[0].type).toBe('graphNode');
    expect(merged[1].type).toBe(ANNOTATION_NODE_TYPE);
  });
});
