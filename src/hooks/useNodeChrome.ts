import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

import type { GraphNodeChrome } from '../types';
import { useStableValue } from './useStableValue';

export interface NodeChromeValue {
  nodeChrome?: GraphNodeChrome;
  onNodeRemove?: (nodeId: string) => void;
  onNodeMenu?: (nodeId: string, position: { x: number; y: number }) => void;
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
}: NodeChromeValue): NodeChromeValue {
  const stableNodeChrome = useStableValue(nodeChrome, nodeChromeEqual);

  const onNodeRemoveRef = useRef(onNodeRemove);
  onNodeRemoveRef.current = onNodeRemove;
  const onNodeMenuRef = useRef(onNodeMenu);
  onNodeMenuRef.current = onNodeMenu;

  const stableOnNodeRemove = useCallback((nodeId: string) => {
    onNodeRemoveRef.current?.(nodeId);
  }, []);

  const stableOnNodeMenu = useCallback((
    nodeId: string,
    position: { x: number; y: number },
  ) => {
    onNodeMenuRef.current?.(nodeId, position);
  }, []);

  const hasRemove = Boolean(onNodeRemove);
  const hasMenu = Boolean(onNodeMenu);

  return useMemo(
    () => ({
      nodeChrome: stableNodeChrome,
      onNodeRemove: hasRemove ? stableOnNodeRemove : undefined,
      onNodeMenu: hasMenu ? stableOnNodeMenu : undefined,
    }),
    [hasMenu, hasRemove, stableNodeChrome, stableOnNodeMenu, stableOnNodeRemove],
  );
}
