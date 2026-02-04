import { useCallback, useEffect, useState } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs';
import type { FlowNode, FlowEdge, LayoutType } from '../types';
import { getLayoutOptions } from '../layouts';
import { NODE_WIDTH, NODE_HEIGHT } from '../utils';

const elk = new ELK();

interface UseGraphLayoutOptions {
  nodes: FlowNode[];
  edges: FlowEdge[];
  layout: LayoutType;
}

interface UseGraphLayoutResult {
  nodes: FlowNode[];
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

export function useGraphLayout({
  nodes,
  edges,
  layout,
}: UseGraphLayoutOptions): UseGraphLayoutResult {
  const [layoutedNodes, setLayoutedNodes] = useState<FlowNode[]>(nodes);
  const [layoutedEdges, setLayoutedEdges] = useState<FlowEdge[]>(edges);
  const [isLayouting, setIsLayouting] = useState(false);

  const applyLayout = useCallback(async () => {
    if (nodes.length === 0) {
      setLayoutedNodes([]);
      setLayoutedEdges([]);
      return;
    }

    setIsLayouting(true);

    try {
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

      const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions: toElkLayoutOptions(getLayoutOptions(layout)),
        children: elkNodes,
        edges: elkEdges,
      };

      const layoutedGraph = await elk.layout(elkGraph);

      if (layoutedGraph.children) {
        const positionMap = new Map<string, { x: number; y: number }>();
        for (const child of layoutedGraph.children) {
          positionMap.set(child.id, {
            x: child.x ?? 0,
            y: child.y ?? 0,
          });
        }

        const newNodes = nodes.map((node) => {
          const position = positionMap.get(node.id) ?? { x: 0, y: 0 };
          return {
            ...node,
            position,
          };
        });

        setLayoutedNodes(newNodes);
        setLayoutedEdges(edges);
      }
    } catch (error) {
      console.error('Layout error:', error);
      // Fall back to original positions
      setLayoutedNodes(nodes);
      setLayoutedEdges(edges);
    } finally {
      setIsLayouting(false);
    }
  }, [nodes, edges, layout]);

  useEffect(() => {
    applyLayout();
  }, [applyLayout]);

  return {
    nodes: layoutedNodes,
    edges: layoutedEdges,
    isLayouting,
  };
}
