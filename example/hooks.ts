import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import type {
  GraphData,
  GraphNodeType,
  GraphEdgeType,
  HoverGeometry,
  GraphAnnotation,
} from '../src';

const ANNOTATIONS_STORAGE_PREFIX = 'translator-graph-view:annotations:';
const SHOW_MINIMAP_STORAGE_KEY = 'translator-graph-view:showMiniMap';

interface LocalStorageOptions<T> {
  read: (key: string) => T;
  write: (key: string, value: T) => void;
}

function useLocalStorage<T>(
  key: string,
  options: LocalStorageOptions<T>,
): [T, (value: SetStateAction<T>) => void] {
  const { read, write } = options;
  const [state, setState] = useState(() => read(key));

  useEffect(() => {
    setState(read(key));
  }, [key, read]);

  const setValue = useCallback((value: SetStateAction<T>) => {
    setState((prev) => {
      const next = typeof value === 'function'
        ? (value as (previous: T) => T)(prev)
        : value;
      try {
        write(key, next);
      } catch {
        // Ignore storage errors (private browsing, quota exceeded, etc.)
      }
      return next;
    });
  }, [key, write]);

  return [state, setValue];
}

function readShowMiniMap(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'false';
  } catch {
    return true;
  }
}

function writeShowMiniMap(key: string, show: boolean): void {
  localStorage.setItem(key, String(show));
}

export function usePersistedShowMiniMap(): {
  showMiniMap: boolean;
  setShowMiniMap: (show: boolean) => void;
} {
  const [showMiniMap, setShowMiniMap] = useLocalStorage(SHOW_MINIMAP_STORAGE_KEY, {
    read: readShowMiniMap,
    write: writeShowMiniMap,
  });

  return { showMiniMap, setShowMiniMap };
}

function readAnnotations(key: string): GraphAnnotation[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GraphAnnotation =>
        typeof item === 'object'
        && item !== null
        && typeof item.id === 'string'
        && typeof item.text === 'string'
        && typeof item.position === 'object'
        && item.position !== null
        && typeof item.position.x === 'number'
        && typeof item.position.y === 'number',
    );
  } catch {
    return [];
  }
}

function writeAnnotations(key: string, annotations: GraphAnnotation[]): void {
  localStorage.setItem(key, JSON.stringify(annotations));
}

export function usePersistedAnnotations(dataset: string): {
  annotations: GraphAnnotation[];
  setAnnotations: (value: SetStateAction<GraphAnnotation[]>) => void;
  addAnnotation: () => void;
} {
  const storageKey = `${ANNOTATIONS_STORAGE_PREFIX}${dataset}`;
  const [annotations, setAnnotations] = useLocalStorage(storageKey, {
    read: readAnnotations,
    write: writeAnnotations,
  });

  const addAnnotation = useCallback(() => {
    setAnnotations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: '',
        position: { x: 80 + prev.length * 24, y: 80 + prev.length * 24 },
      },
    ]);
  }, [setAnnotations]);

  return { annotations, setAnnotations, addAnnotation };
}

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
