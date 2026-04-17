import { describe, it, expect } from 'vitest';
import {
  transformNodesToFlow,
  transformEdgesToFlow,
  formatPredicate,
  getNodesById,
  getEdgesById,
} from './dataTransform';
import type { GraphData } from '../types';

const sampleData: GraphData = {
  nodes: {
    a: { id: 'a', names: ['Aspirin'], types: ['biolink:Drug'] },
    b: { id: 'b', names: ['Pain'], types: ['biolink:Disease'] },
    c: { id: 'c', names: [], types: ['biolink:Gene'] },
  },
  edges: {
    e1: { id: 'e1', subject: 'a', object: 'b', predicate: 'biolink:treats' },
    e2: { id: 'e2', subject: 'b', object: 'a', predicate: 'biolink:treated_by' },
    e3: { id: 'e3', subject: 'a', object: 'b', predicate: 'biolink:affects' },
    e4: { id: 'e4', subject: 'a', object: 'c', predicate: 'biolink:interacts_with' },
  },
};

describe('transformNodesToFlow', () => {
  it('maps every node to a FlowNode with graphNode type', () => {
    const nodes = transformNodesToFlow(sampleData);
    expect(nodes).toHaveLength(3);
    expect(nodes.every((n) => n.type === 'graphNode')).toBe(true);
  });

  it('uses the first name as label, falling back to id', () => {
    const nodes = transformNodesToFlow(sampleData);
    const aspirin = nodes.find((n) => n.id === 'a');
    const missingName = nodes.find((n) => n.id === 'c');
    expect(aspirin?.data.label).toBe('Aspirin');
    expect(missingName?.data.label).toBe('c');
  });

  it('simplifies the primary type', () => {
    const nodes = transformNodesToFlow(sampleData);
    expect(nodes.find((n) => n.id === 'a')?.data.primaryType).toBe('Drug');
  });
});

describe('transformEdgesToFlow', () => {
  it('maps every edge to a FlowEdge', () => {
    const edges = transformEdgesToFlow(sampleData);
    expect(edges).toHaveLength(4);
    expect(edges.every((e) => e.type === 'graphEdge')).toBe(true);
  });

  it('assigns edgeIndex/edgeTotalCount to grouped pairs regardless of direction', () => {
    const edges = transformEdgesToFlow(sampleData);
    // e1, e2, e3 all share the (a,b) pair → count 3
    const grouped = edges.filter((e) => ['e1', 'e2', 'e3'].includes(e.id));
    expect(grouped.every((e) => e.data?.edgeTotalCount === 3)).toBe(true);
    const indices = grouped.map((e) => e.data?.edgeIndex).sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  it('leaves edgeIndex/edgeTotalCount undefined for unique pairs', () => {
    const edges = transformEdgesToFlow(sampleData);
    const solo = edges.find((e) => e.id === 'e4');
    expect(solo?.data?.edgeIndex).toBeUndefined();
    expect(solo?.data?.edgeTotalCount).toBeUndefined();
  });

  it('passes through edgeType and showLabel', () => {
    const edges = transformEdgesToFlow(sampleData, 'step', true);
    expect(edges[0].data?.edgeType).toBe('step');
    expect(edges[0].data?.showLabel).toBe(true);
  });
});

describe('formatPredicate', () => {
  it('strips biolink: prefix and converts underscores to spaces', () => {
    expect(formatPredicate('biolink:treated_by')).toBe('treated by');
  });

  it('strips generic prefixes', () => {
    expect(formatPredicate('foo:some_thing')).toBe('some thing');
  });

  it('only converts underscores when no prefix present', () => {
    expect(formatPredicate('some_thing')).toBe('some thing');
  });
});

describe('getNodesById / getEdgesById', () => {
  it('returns matching nodes and filters missing ids', () => {
    expect(getNodesById(sampleData, ['a', 'missing', 'b'])).toHaveLength(2);
  });

  it('returns matching edges and filters missing ids', () => {
    expect(getEdgesById(sampleData, ['e1', 'missing'])).toHaveLength(1);
  });
});
