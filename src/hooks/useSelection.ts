import { useCallback, useMemo } from 'react';
import type { OnSelectionChangeParams } from '@xyflow/react';
import type { GraphData, GraphNode, GraphEdge, Selection, FlowNode, FlowEdge } from '../types';

interface UseSelectionOptions {
  data: GraphData;
  onSelectionChange?: (selection: Selection) => void;
}

interface UseSelectionResult {
  handleSelectionChange: (params: OnSelectionChangeParams) => void;
  getSelectedNodes: (flowNodes: FlowNode[]) => GraphNode[];
  getSelectedEdges: (flowEdges: FlowEdge[]) => GraphEdge[];
}

export function useSelection({
  data,
  onSelectionChange,
}: UseSelectionOptions): UseSelectionResult {
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      if (!onSelectionChange) return;

      const selectedNodes: GraphNode[] = params.nodes
        .map((node) => data.nodes[node.id])
        .filter((node): node is GraphNode => node !== undefined);

      const selectedEdges: GraphEdge[] = params.edges
        .map((edge) => data.edges[edge.id])
        .filter((edge): edge is GraphEdge => edge !== undefined);

      onSelectionChange({
        nodes: selectedNodes,
        edges: selectedEdges,
      });
    },
    [data, onSelectionChange]
  );

  const getSelectedNodes = useCallback(
    (flowNodes: FlowNode[]): GraphNode[] => {
      return flowNodes
        .filter((node) => node.selected)
        .map((node) => data.nodes[node.id])
        .filter((node): node is GraphNode => node !== undefined);
    },
    [data]
  );

  const getSelectedEdges = useCallback(
    (flowEdges: FlowEdge[]): GraphEdge[] => {
      return flowEdges
        .filter((edge) => edge.selected)
        .map((edge) => data.edges[edge.id])
        .filter((edge): edge is GraphEdge => edge !== undefined);
    },
    [data]
  );

  return useMemo(
    () => ({
      handleSelectionChange,
      getSelectedNodes,
      getSelectedEdges,
    }),
    [handleSelectionChange, getSelectedNodes, getSelectedEdges]
  );
}
