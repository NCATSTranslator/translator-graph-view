import type { HoverAnchorPosition, HoverGeometry } from '../types';

/**
 * Class names rendered by @xyflow/react for nodes and edges. They are part of the
 * library’s public DOM surface, but **re-verify these selectors after major @xyflow upgrades**.
 * @see https://reactflow.dev
 */
export const REACT_FLOW_NODE_CLASS = 'react-flow__node';
export const REACT_FLOW_EDGE_CLASS = 'react-flow__edge';
export const REACT_FLOW_EDGE_PATH_CLASS = 'react-flow__edge-path';

/**
 * Escape an element id for use inside `[data-id="…"]` (double-quoted attribute value).
 */
export function escapeDataIdForAttributeSelector(id: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(id);
  }
  // Fallback when `CSS.escape` is missing: escape `\` and `"` inside the attribute value.
  return id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function nodeSelector(nodeId: string): string {
  return `.${REACT_FLOW_NODE_CLASS}[data-id="${escapeDataIdForAttributeSelector(nodeId)}"]`;
}

function edgePathSelector(edgeId: string): string {
  return `.${REACT_FLOW_EDGE_CLASS}[data-id="${escapeDataIdForAttributeSelector(edgeId)}"] .${REACT_FLOW_EDGE_PATH_CLASS}`;
}

/**
 * Compute an anchor point from a bounding rect and a named position.
 * Does NOT handle 'midpoint' — that is edge-specific and computed separately.
 */
export function anchorFromRect(
  rect: { x: number; y: number; width: number; height: number },
  position: HoverAnchorPosition,
): { x: number; y: number } {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  switch (position) {
    case 'topLeft':      return { x: rect.x, y: rect.y };
    case 'topCenter':    return { x: cx, y: rect.y };
    case 'topRight':     return { x: rect.x + rect.width, y: rect.y };
    case 'centerLeft':   return { x: rect.x, y: cy };
    case 'center':       return { x: cx, y: cy };
    case 'centerRight':  return { x: rect.x + rect.width, y: cy };
    case 'bottomLeft':   return { x: rect.x, y: rect.y + rect.height };
    case 'bottomCenter': return { x: cx, y: rect.y + rect.height };
    case 'bottomRight':  return { x: rect.x + rect.width, y: rect.y + rect.height };
    // 'midpoint' falls back to center for non-edge contexts
    case 'midpoint':     return { x: cx, y: cy };
  }
}

function toRect(domRect: DOMRect): { x: number; y: number; width: number; height: number } {
  return { x: domRect.x, y: domRect.y, width: domRect.width, height: domRect.height };
}

/**
 * Measure hover geometry for a node element.
 * Nodes are HTML elements with data-id matching the node ID.
 * @param root Search root (e.g. the GraphView wrapper); avoids matching another React Flow on the page.
 */
export function measureNodeGeometry(
  nodeId: string,
  anchor: HoverAnchorPosition,
  root: Element | null,
): HoverGeometry | null {
  if (typeof document === 'undefined' || !root) return null;

  let resolvedAnchor = anchor;
  if (anchor === 'midpoint') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `translator-graph-view: 'midpoint' anchor is only valid for edges. Falling back to 'center' for node "${nodeId}".`,
      );
    }
    resolvedAnchor = 'center';
  }

  const el = root.querySelector(nodeSelector(nodeId));
  if (!el) return null;

  const rect = toRect(el.getBoundingClientRect());
  return {
    rect,
    anchor: anchorFromRect(rect, resolvedAnchor),
    anchorPosition: resolvedAnchor,
  };
}

/**
 * Measure hover geometry for an edge element.
 * Edges are SVG paths; 'midpoint' uses getPointAtLength + getScreenCTM.
 * @param root Search root (e.g. the GraphView wrapper); avoids matching another React Flow on the page.
 */
export function measureEdgeGeometry(
  edgeId: string,
  anchor: HoverAnchorPosition,
  root: Element | null,
): HoverGeometry | null {
  if (typeof document === 'undefined' || !root) return null;

  const pathEl = root.querySelector(edgePathSelector(edgeId)) as SVGPathElement | null;
  if (!pathEl) return null;

  const rect = toRect(pathEl.getBoundingClientRect());

  if (anchor === 'midpoint') {
    const totalLength = pathEl.getTotalLength();
    if (totalLength === 0) {
      return { rect, anchor: anchorFromRect(rect, 'center'), anchorPosition: 'midpoint' };
    }

    const svgPoint = pathEl.getPointAtLength(totalLength / 2);
    const ctm = pathEl.getScreenCTM();
    if (!ctm) {
      return { rect, anchor: anchorFromRect(rect, 'center'), anchorPosition: 'midpoint' };
    }

    // Transform SVG-local point to viewport coordinates
    const anchorPt = {
      x: ctm.a * svgPoint.x + ctm.c * svgPoint.y + ctm.e,
      y: ctm.b * svgPoint.x + ctm.d * svgPoint.y + ctm.f,
    };
    return { rect, anchor: anchorPt, anchorPosition: 'midpoint' };
  }

  return {
    rect,
    anchor: anchorFromRect(rect, anchor),
    anchorPosition: anchor,
  };
}
