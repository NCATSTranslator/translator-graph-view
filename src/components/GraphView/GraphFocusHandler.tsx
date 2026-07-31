import type { MutableRefObject } from 'react';
import type { GraphFocusRequest } from '../../types';
import { useFocusNode } from './hooks';

interface GraphFocusHandlerProps {
  focusRequest?: GraphFocusRequest | null;
  consumedTokenRef: MutableRefObject<number | undefined>;
}

/** Runs inside ReactFlow so focus can resolve nodes from the live store. */
export function GraphFocusHandler({ focusRequest, consumedTokenRef }: GraphFocusHandlerProps) {
  useFocusNode(focusRequest, consumedTokenRef);
  return null;
}
