import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  GraphData,
  GraphNodeType,
  GraphEdgeType,
  HoverGeometry,
} from '../src';

/**
 * Delay `hovered` becoming the tooltip target until it's been stable for
 * `delay` ms. Clears immediately when `hovered` goes null.
 */
export function useTooltipDelay<T>(hovered: T | null, delay: number): T | null {
  const [tooltip, setTooltip] = useState<T | null>(null);
  const hoveredRef = useRef(hovered);
  hoveredRef.current = hovered;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (hovered) {
      timerRef.current = setTimeout(() => setTooltip(hoveredRef.current), delay);
    } else {
      setTooltip(null);
    }
    return () => clearTimeout(timerRef.current);
  }, [hovered, delay]);

  return tooltip;
}

/**
 * Fetch `./example.json` and expose the parsed graph plus any load error.
 */
export function useExampleData(): { data: GraphData | null; error: string | null } {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('./example.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load example.json');
        return res.json();
      })
      .then((json) => {
        if (!json.nodes || !json.edges) {
          throw new Error('Invalid data: missing nodes or edges');
        }
        setData(json as GraphData);
      })
      .catch((err: Error) => {
        console.error('Error loading data:', err);
        setError(err.message);
      });
  }, []);

  return { data, error };
}

export interface HoverState {
  hoveredNode: GraphNodeType | null;
  hoveredEdge: GraphEdgeType | null;
  hoverGeometry: HoverGeometry | null;
  tooltipPos: { x: number; y: number } | null;
  handleNodeHover: (node: GraphNodeType | null, geometry: HoverGeometry | null) => void;
  handleEdgeHover: (edge: GraphEdgeType | null, geometry: HoverGeometry | null) => void;
  clearGeometry: () => void;
}

/**
 * Owns the hover state for the graph: hovered node/edge, last anchor geometry,
 * and the tooltip position derived from geometry + offset.
 */
export function useGraphHoverState(tooltipOffset: { x: number; y: number }): HoverState {
  const [hoveredNode, setHoveredNode] = useState<GraphNodeType | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdgeType | null>(null);
  const [hoverGeometry, setHoverGeometry] = useState<HoverGeometry | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const applyGeometry = useCallback(
    (present: boolean, geometry: HoverGeometry | null) => {
      setHoverGeometry(geometry);
      if (present && geometry) {
        setTooltipPos({ x: geometry.anchor.x + tooltipOffset.x, y: geometry.anchor.y + tooltipOffset.y });
      } else if (!present) {
        setTooltipPos(null);
      }
    },
    [tooltipOffset.x, tooltipOffset.y],
  );

  const handleNodeHover = useCallback(
    (node: GraphNodeType | null, geometry: HoverGeometry | null) => {
      setHoveredNode(node);
      applyGeometry(!!node, geometry);
    },
    [applyGeometry],
  );

  const handleEdgeHover = useCallback(
    (edge: GraphEdgeType | null, geometry: HoverGeometry | null) => {
      setHoveredEdge(edge);
      applyGeometry(!!edge, geometry);
    },
    [applyGeometry],
  );

  const clearGeometry = useCallback(() => setHoverGeometry(null), []);

  return { hoveredNode, hoveredEdge, hoverGeometry, tooltipPos, handleNodeHover, handleEdgeHover, clearGeometry };
}
