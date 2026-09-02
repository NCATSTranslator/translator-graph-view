import { createContext, useContext, useMemo } from 'react';

import type { GraphNodeChrome, GraphNodeColorRenderer, GraphNodeIconRenderer } from '../types';
import { useStableCallback } from './useStableCallback';
import { useStableValue } from './useStableValue';

export interface NodeChromeValue {
  nodeChrome?: GraphNodeChrome;
  onNodeRemove?: (nodeId: string) => void;
  onNodeMenu?: (nodeId: string, position: { x: number; y: number }) => void;
  getNodeIcon?: GraphNodeIconRenderer;
  getNodeColor?: GraphNodeColorRenderer;
}

const defaults: NodeChromeValue = {};

export const NodeChromeContext = createContext<NodeChromeValue>(defaults);

export function useNodeChrome(): NodeChromeValue {
  return useContext(NodeChromeContext);
}

function nodeChromeEqual(a: GraphNodeChrome, b: GraphNodeChrome): boolean {
  return a.topLeft === b.topLeft && a.bottomRight === b.bottomRight;
}

/** Stable chrome context value so edges/annotations are not re-rendered by callback identity. */
export function useNodeChromeValue({
  nodeChrome,
  onNodeRemove,
  onNodeMenu,
  getNodeIcon,
  getNodeColor,
}: NodeChromeValue): NodeChromeValue {
  const stableNodeChrome = useStableValue(nodeChrome, nodeChromeEqual);
  const stableOnNodeRemove = useStableCallback(onNodeRemove);
  const stableOnNodeMenu = useStableCallback(onNodeMenu);
  const stableGetNodeIcon = useStableCallback(getNodeIcon);
  const stableGetNodeColor = useStableCallback(getNodeColor);

  return useMemo(
    () => ({
      nodeChrome: stableNodeChrome,
      onNodeRemove: stableOnNodeRemove,
      onNodeMenu: stableOnNodeMenu,
      getNodeIcon: stableGetNodeIcon,
      getNodeColor: stableGetNodeColor,
    }),
    [
      stableGetNodeColor,
      stableGetNodeIcon,
      stableNodeChrome,
      stableOnNodeMenu,
      stableOnNodeRemove,
    ],
  );
}
