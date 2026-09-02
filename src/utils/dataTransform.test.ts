import { describe, it, expect } from 'vitest';
import {
  transformNodesToFlow,
  transformEdgesToFlow,
  formatPredicate,
  getNodesById,
  getEdgesById,
  estimateNodeWidth,
  getNodeDisplayLabel,
  NODE_MIN_WIDTH,
  NODE_MAX_WIDTH,
  NODE_WIDTH,
  NODE_HEIGHT,
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

  it('uses provided positions when supplied', () => {
    const nodes = transformNodesToFlow(sampleData, {
      a: { x: 10, y: 20 },
      b: { x: 30, y: 40 },
    });
    expect(nodes.find((n) => n.id === 'a')?.position).toEqual({ x: 10, y: 20 });
    expect(nodes.find((n) => n.id === 'b')?.position).toEqual({ x: 30, y: 40 });
    expect(nodes.find((n) => n.id === 'c')?.position).toEqual({ x: 0, y: 0 });
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

describe('getNodeDisplayLabel', () => {
  it('uppercases gene and protein labels', () => {
    expect(getNodeDisplayLabel('brca1', 'Gene')).toBe('BRCA1');
    expect(getNodeDisplayLabel('cox-2', 'Protein')).toBe('COX-2');
  });

  it('capitalizes each word for other types', () => {
    expect(getNodeDisplayLabel('type ii diabetes', 'Disease')).toBe('Type II Diabetes');
  });
});

describe('estimateNodeWidth', () => {
  it('stays within the bounds the stylesheet enforces', () => {
    const labels = ['a', 'aspirin', 'x'.repeat(200), ''];
    for (const label of labels) {
      const width = estimateNodeWidth(label, 'Drug');
      expect(width).toBeGreaterThanOrEqual(NODE_MIN_WIDTH);
      expect(width).toBeLessThanOrEqual(NODE_MAX_WIDTH);
    }
  });

  it('clamps a very short label to the minimum width', () => {
    expect(estimateNodeWidth('a', 'Drug')).toBe(NODE_MIN_WIDTH);
  });

  it('falls back to NODE_WIDTH when the label is empty', () => {
    expect(estimateNodeWidth('', 'Drug')).toBe(NODE_WIDTH);
  });

  it('clamps a very long label to the maximum width', () => {
    expect(estimateNodeWidth('x'.repeat(100), 'Drug')).toBe(NODE_MAX_WIDTH);
  });

  it('grows with label length', () => {
    expect(estimateNodeWidth('aspirin', 'Drug'))
      .toBeLessThan(estimateNodeWidth('acetylsalicylic', 'Drug'));
  });

  it('allows more width per character for uppercased types', () => {
    expect(estimateNodeWidth('abcdef', 'Gene'))
      .toBeGreaterThan(estimateNodeWidth('abcdef', 'Drug'));
  });

  /*
   * Widths measured in a browser at the label's 12px/800 font. The layout boxes
   * only produce the spacing we configure while they track what is painted, so
   * the estimate is held to within 10% of the real thing.
   */
  it.each([
    ['Metformin', 'Drug', 112.2],
    ['Ibuprofen', 'Drug', 108.3],
    ['Glucose', 'ChemicalEntity', 97.6],
    ['Type 2 Diabetes', 'Disease', 146.9],
    ['Prostaglandin E2', 'ChemicalEntity', 152.7],
    ['Rheumatoid Arthritis', 'Disease', 177.5],
    ['COX-2', 'Protein', 88.2],
  ])('estimates %s within 10%% of its rendered width', (label, type, measured) => {
    const estimate = estimateNodeWidth(label as string, type as string);
    expect(Math.abs(estimate - (measured as number)) / (measured as number)).toBeLessThan(0.1);
  });
});

describe('node layout dimensions', () => {
  /*
   * 24px icon + 4px padding top and bottom. ELK spaces nodes by their bounding
   * boxes, so a height taller than this reappears as unwanted vertical gap.
   */
  it('matches the height the stylesheet paints', () => {
    expect(NODE_HEIGHT).toBe(32);
  });
});
