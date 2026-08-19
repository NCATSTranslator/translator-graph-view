import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ELK from 'elkjs/lib/elk-api.js';
import type { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs';
import type { FlowGraphNode, FlowEdge, LayoutType, NodePositionMap } from '../types';
import { getLayoutOptions } from '../layouts';
import { NODE_WIDTH, NODE_HEIGHT } from '../utils';
import { flowGraphNodesToPositionMap } from '../utils/positionMap';

interface UseGraphLayoutOptions {
  nodes: FlowGraphNode[];
  edges: FlowEdge[];
  layout: LayoutType;
  elkWorkerUrl: string;
  onLayoutComplete?: (positions: NodePositionMap) => void;
}

interface UseGraphLayoutResult {
  nodes: FlowGraphNode[];
  edges: FlowEdge[];
  isLayouting: boolean;
}

// Convert our layout options to ELK's string-based format
function toElkLayoutOptions(options: ReturnType<typeof getLayoutOptions>): LayoutOptions {
  const result: LayoutOptions = {};
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      result[key] = String(value);
    }
  }
  return result;
}

function buildElkGraph(nodes: FlowGraphNode[], edges: FlowEdge[], layout: LayoutType): ElkNode {
  const elkNodes: ElkNode[] = nodes.map((node) => ({
    id: node.id,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  }));
  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));
  return {
    id: 'root',
    layoutOptions: toElkLayoutOptions(getLayoutOptions(layout)),
    children: elkNodes,
    edges: elkEdges,
  };
}

function applyElkPositions(nodes: FlowGraphNode[], layoutedGraph: ElkNode): FlowGraphNode[] {
  const positionMap = new Map<string, { x: number; y: number }>();
  for (const child of layoutedGraph.children ?? []) {
    positionMap.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }
  return nodes.map((node) => ({
    ...node,
    position: positionMap.get(node.id) ?? { x: 0, y: 0 },
  }));
}

interface LayoutStateSetters {
  setLayoutedNodes: (nodes: FlowGraphNode[]) => void;
  setLayoutedEdges: (edges: FlowEdge[]) => void;
  setIsLayouting: (value: boolean) => void;
}

function applyCustomLayout(
  nodes: FlowGraphNode[],
  edges: FlowEdge[],
  setters: LayoutStateSetters,
  onLayoutComplete?: (positions: NodePositionMap) => void,
): void {
  setters.setLayoutedNodes(nodes);
  setters.setLayoutedEdges(edges);
  setters.setIsLayouting(false);
  onLayoutComplete?.(flowGraphNodesToPositionMap(nodes));
}

async function applyElkLayout({
  elk,
  nodes,
  edges,
  layout,
  cancelled,
  setters,
  onLayoutComplete,
}: {
  elk: InstanceType<typeof ELK>;
  nodes: FlowGraphNode[];
  edges: FlowEdge[];
  layout: LayoutType;
  cancelled: () => boolean;
  setters: LayoutStateSetters;
  onLayoutComplete?: (positions: NodePositionMap) => void;
}): Promise<void> {
  const layoutedGraph = await elk.layout(buildElkGraph(nodes, edges, layout));
  if (cancelled() || !layoutedGraph.children) return;
  const positioned = applyElkPositions(nodes, layoutedGraph);
  setters.setLayoutedNodes(positioned);
  setters.setLayoutedEdges(edges);
  onLayoutComplete?.(flowGraphNodesToPositionMap(positioned));
}

export function useGraphLayout({
  nodes,
  edges,
  layout,
  elkWorkerUrl,
  onLayoutComplete,
}: UseGraphLayoutOptions): UseGraphLayoutResult {
  const elk = useMemo(() => new ELK({ workerUrl: elkWorkerUrl }), [elkWorkerUrl]);
  const onLayoutCompleteRef = useRef(onLayoutComplete);
  onLayoutCompleteRef.current = onLayoutComplete;

  const [layoutedNodes, setLayoutedNodes] = useState<FlowGraphNode[]>(nodes);
  const [layoutedEdges, setLayoutedEdges] = useState<FlowEdge[]>(edges);
  const [isLayouting, setIsLayouting] = useState(false);

  const applyLayout = useCallback(async (cancelled: () => boolean) => {
    const setters = { setLayoutedNodes, setLayoutedEdges, setIsLayouting };
    if (nodes.length === 0) {
      setLayoutedNodes([]);
      setLayoutedEdges([]);
      return;
    }

    if (layout === 'custom') {
      applyCustomLayout(nodes, edges, setters, onLayoutCompleteRef.current);
      return;
    }

    setIsLayouting(true);
    try {
      await applyElkLayout({
        elk,
        nodes,
        edges,
        layout,
        cancelled,
        setters,
        onLayoutComplete: onLayoutCompleteRef.current,
      });
    } catch (error) {
      if (cancelled()) return;
      console.error('Layout error:', error);
      setLayoutedNodes(nodes);
      setLayoutedEdges(edges);
    } finally {
      if (!cancelled()) {
        setIsLayouting(false);
      }
    }
  }, [nodes, edges, layout, elk]);

  useEffect(() => {
    let stale = false;
    applyLayout(() => stale);
    return () => { stale = true; };
  }, [applyLayout]);

  return {
    nodes: layoutedNodes,
    edges: layoutedEdges,
    isLayouting,
  };
}
