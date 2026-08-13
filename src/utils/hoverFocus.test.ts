import { describe, it, expect } from 'vitest';
import { computeHoverFocus } from './hoverFocus';

const edges = [
  { id: 'e1', source: 'a', target: 'b' },
  { id: 'e2', source: 'b', target: 'c' },
  { id: 'e3', source: 'd', target: 'e' },
];

describe('computeHoverFocus', () => {
  it('returns empty sets when nothing is hovered', () => {
    const result = computeHoverFocus(edges, {});
    expect(result.isDimming).toBe(false);
    expect(result.hoveredNodeIds.size).toBe(0);
    expect(result.focusedNodeIds.size).toBe(0);
  });

  it('keeps a hovered node, neighbors, and incident edges focused', () => {
    const result = computeHoverFocus(edges, { hoveredNodeId: 'b' });
    expect(result.isDimming).toBe(true);
    expect([...result.hoveredNodeIds]).toEqual(['b']);
    expect(result.focusedNodeIds).toEqual(new Set(['a', 'b', 'c']));
    expect(result.focusedEdgeIds).toEqual(new Set(['e1', 'e2']));
  });

  it('keeps a hovered edge and its endpoints focused', () => {
    const result = computeHoverFocus(edges, { hoveredEdgeId: 'e3' });
    expect(result.isDimming).toBe(true);
    expect([...result.hoveredEdgeIds]).toEqual(['e3']);
    expect(result.focusedNodeIds).toEqual(new Set(['d', 'e']));
    expect(result.focusedEdgeIds).toEqual(new Set(['e3']));
  });

  it('prefers annotation hover and does not dim', () => {
    const result = computeHoverFocus(edges, {
      hoveredAnnotationId: 'ann-1',
      hoveredNodeId: 'a',
      hoveredEdgeId: 'e1',
    });
    expect(result.isDimming).toBe(false);
    expect([...result.hoveredAnnotationIds]).toEqual(['ann-1']);
    expect(result.hoveredNodeIds.size).toBe(0);
    expect(result.focusedNodeIds.size).toBe(0);
  });

  it('prefers node over edge when both are set', () => {
    const result = computeHoverFocus(edges, {
      hoveredNodeId: 'a',
      hoveredEdgeId: 'e3',
    });
    expect([...result.hoveredNodeIds]).toEqual(['a']);
    expect(result.hoveredEdgeIds.size).toBe(0);
    expect(result.focusedNodeIds).toEqual(new Set(['a', 'b']));
  });
});
