import { describe, it, expect } from 'vitest';
import type { FlowGraphNode, FlowNode } from '../types';
import {
  flowGraphNodesToPositionMap,
  flowNodesToPositionMap,
  getFitViewPaddingKey,
} from './positionMap';

const graphNode: FlowGraphNode = {
  id: 'a',
  type: 'graphNode',
  position: { x: 10, y: 20 },
  data: {
    label: 'A',
    graphNode: { id: 'a', names: ['A'], types: ['biolink:Drug'] },
    primaryType: 'Drug',
  },
};

describe('flowGraphNodesToPositionMap', () => {
  it('maps graph node ids to positions', () => {
    expect(flowGraphNodesToPositionMap([graphNode])).toEqual({ a: { x: 10, y: 20 } });
  });
});

describe('flowNodesToPositionMap', () => {
  it('excludes annotation nodes by default', () => {
    const nodes: FlowNode[] = [
      graphNode,
      {
        id: 'ann-1',
        type: 'graphAnnotation',
        position: { x: 50, y: 50 },
        data: { text: 'Note', annotation: { id: 'ann-1', text: 'Note', position: { x: 50, y: 50 } } },
        draggable: true,
        selectable: false,
      },
    ];
    expect(flowNodesToPositionMap(nodes)).toEqual({ a: { x: 10, y: 20 } });
  });
});

describe('getFitViewPaddingKey', () => {
  it('stringifies numeric padding', () => {
    expect(getFitViewPaddingKey(0.1)).toBe('0.1');
  });

  it('stringifies object padding', () => {
    const padding = { top: '48px' as const, right: 0.2, bottom: 0.2, left: 0.2 };
    expect(getFitViewPaddingKey(padding)).toBe(JSON.stringify(padding));
  });
});
