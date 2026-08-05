import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useReactFlow, useNodesInitialized, useStore } from '@xyflow/react';
import type { FitViewPadding, GraphFocusRequest, LayoutType } from '../../types';
import { getFitViewPaddingKey } from '../../utils/positionMap';
import { DEFAULT_FIT_VIEW_PADDING, scheduleFitView } from './constants';
import { hasPendingFocusRequest } from './hooks';

interface CustomLayoutFitHandlerProps {
  layout?: LayoutType;
  fitViewPadding?: FitViewPadding;
  viewportSyncKey?: string;
  layoutKey: string;
  focusRequest?: GraphFocusRequest | null;
  consumedFocusTokenRef: MutableRefObject<number | undefined>;
}

/** Runs inside ReactFlow so fitView can resolve measured node bounds. */
export function CustomLayoutFitHandler({
  layout,
  fitViewPadding = DEFAULT_FIT_VIEW_PADDING,
  viewportSyncKey,
  layoutKey,
  focusRequest,
  consumedFocusTokenRef,
}: CustomLayoutFitHandlerProps) {
  const { fitView } = useReactFlow();
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;
  const fitViewPaddingRef = useRef(fitViewPadding);
  fitViewPaddingRef.current = fitViewPadding;
  const nodesInitialized = useNodesInitialized();
  const prevSyncKeyRef = useRef<string | null>(null);
  const { width, height } = useStore((state) => ({
    width: state.width,
    height: state.height,
  }));

  useEffect(() => {
    if (layout !== 'custom' || !nodesInitialized || !layoutKey) return;
    if (width < 1 || height < 1) return;
    if (hasPendingFocusRequest(focusRequest, consumedFocusTokenRef)) return;

    const syncKey = `${viewportSyncKey ?? ''}|${layoutKey}|${width}x${height}|${getFitViewPaddingKey(fitViewPadding)}`;
    if (prevSyncKeyRef.current === syncKey) return;
    prevSyncKeyRef.current = syncKey;

    return scheduleFitView(
      (opts) => fitViewRef.current(opts),
      fitViewPaddingRef.current,
    );
  }, [
    layout,
    nodesInitialized,
    width,
    height,
    fitViewPadding,
    viewportSyncKey,
    layoutKey,
    focusRequest,
    consumedFocusTokenRef,
  ]);

  return null;
}
