import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSelection } from './useSelection';
import type { GraphData, FlowNode, FlowEdge } from '../types';

const data: GraphData = {
  nodes: {
    a: { id: 'a', names: ['A'], types: ['biolink:Drug'] },
    b: { id: 'b', names: ['B'], types: ['biolink:Gene'] },
  },
  edges: {
    e1: { id: 'e1', subject: 'a', object: 'b', predicate: 'biolink:treats' },
  },
};

function makeFlowNode(id: string, selected: boolean): FlowNode {
  return {
    id,
    type: 'graphNode',
    position: { x: 0, y: 0 },
    selected,
    data: { label: id, graphNode: data.nodes[id], primaryType: 'X', color: '#000' },
  };
}

function makeFlowEdge(id: string, selected: boolean): FlowEdge {
  return {
    id,
    source: data.edges[id].subject,
    target: data.edges[id].object,
    selected,
    data: { label: 'x', graphEdge: data.edges[id] },
  };
}

describe('useSelection', () => {
  it('invokes onSelectionChange with resolved nodes and edges', () => {
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() => useSelection({ data, onSelectionChange }));

    result.current.handleSelectionChange({
      nodes: [{ id: 'a' } as never, { id: 'missing' } as never],
      edges: [{ id: 'e1' } as never],
    });

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const arg = onSelectionChange.mock.calls[0][0];
    expect(arg.nodes.map((n: { id: string }) => n.id)).toEqual(['a']);
    expect(arg.edges.map((e: { id: string }) => e.id)).toEqual(['e1']);
  });

  it('is a no-op when onSelectionChange is omitted', () => {
    const { result } = renderHook(() => useSelection({ data }));
    expect(() =>
      result.current.handleSelectionChange({ nodes: [], edges: [] }),
    ).not.toThrow();
  });

  it('getSelectedNodes returns only flow nodes that are selected', () => {
    const { result } = renderHook(() => useSelection({ data }));
    const selected = result.current.getSelectedNodes([
      makeFlowNode('a', true),
      makeFlowNode('b', false),
    ]);
    expect(selected.map((n) => n.id)).toEqual(['a']);
  });

  it('getSelectedEdges returns only flow edges that are selected', () => {
    const { result } = renderHook(() => useSelection({ data }));
    const selected = result.current.getSelectedEdges([makeFlowEdge('e1', true)]);
    expect(selected.map((e) => e.id)).toEqual(['e1']);
  });
});
