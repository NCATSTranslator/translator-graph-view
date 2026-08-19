export interface HoverFocusIds {
  hoveredNodeId?: string | null;
  hoveredEdgeId?: string | null;
  hoveredAnnotationId?: string | null;
}

export interface HoverFocusEdge {
  id: string;
  source: string;
  target: string;
}

export interface HoverFocusSets {
  hoveredNodeIds: Set<string>;
  hoveredEdgeIds: Set<string>;
  hoveredAnnotationIds: Set<string>;
  focusedNodeIds: Set<string>;
  focusedEdgeIds: Set<string>;
  /** True when node/edge hover is active and non-focused elements should dim. */
  isDimming: boolean;
}

const emptySets = (): HoverFocusSets => ({
  hoveredNodeIds: new Set(),
  hoveredEdgeIds: new Set(),
  hoveredAnnotationIds: new Set(),
  focusedNodeIds: new Set(),
  focusedEdgeIds: new Set(),
  isDimming: false,
});

function focusFromHoveredNode(edges: HoverFocusEdge[], hoveredNodeId: string): HoverFocusSets {
  const focusedNodeIds = new Set<string>([hoveredNodeId]);
  const focusedEdgeIds = new Set<string>();
  for (const edge of edges) {
    if (edge.source === hoveredNodeId || edge.target === hoveredNodeId) {
      focusedEdgeIds.add(edge.id);
      focusedNodeIds.add(edge.source);
      focusedNodeIds.add(edge.target);
    }
  }
  return {
    hoveredNodeIds: new Set([hoveredNodeId]),
    hoveredEdgeIds: new Set(),
    hoveredAnnotationIds: new Set(),
    focusedNodeIds,
    focusedEdgeIds,
    isDimming: true,
  };
}

function focusFromHoveredEdge(edges: HoverFocusEdge[], hoveredEdgeId: string): HoverFocusSets {
  const edge = edges.find((item) => item.id === hoveredEdgeId);
  const focusedNodeIds = new Set<string>();
  const focusedEdgeIds = new Set<string>([hoveredEdgeId]);
  if (edge) {
    focusedNodeIds.add(edge.source);
    focusedNodeIds.add(edge.target);
  }
  return {
    hoveredNodeIds: new Set(),
    hoveredEdgeIds: new Set([hoveredEdgeId]),
    hoveredAnnotationIds: new Set(),
    focusedNodeIds,
    focusedEdgeIds,
    isDimming: true,
  };
}

/**
 * Resolve neighborhood hover focus.
 * Preference when multiple ids are set: annotation > node > edge.
 */
export function computeHoverFocus(
  edges: HoverFocusEdge[],
  focus: HoverFocusIds,
): HoverFocusSets {
  const { hoveredAnnotationId, hoveredNodeId, hoveredEdgeId } = focus;

  if (hoveredAnnotationId) {
    const sets = emptySets();
    sets.hoveredAnnotationIds.add(hoveredAnnotationId);
    return sets;
  }

  if (hoveredNodeId) {
    return focusFromHoveredNode(edges, hoveredNodeId);
  }

  if (hoveredEdgeId) {
    return focusFromHoveredEdge(edges, hoveredEdgeId);
  }

  return emptySets();
}
