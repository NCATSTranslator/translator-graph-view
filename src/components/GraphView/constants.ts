import type { FitViewPadding } from '../../types';

export const DEFAULT_FIT_VIEW_PADDING: FitViewPadding = 0.1;
export const FIT_VIEW_DURATION_MS = 200;
export const FIT_VIEW_DEFER_MS = 50;

export type FitViewFn = (opts?: { padding?: FitViewPadding; duration?: number }) => void;

/** Defer fitView until after the DOM commits measured node bounds. */
export function scheduleFitView(
  fitView: FitViewFn,
  padding: FitViewPadding,
): () => void {
  const timer = setTimeout(() => {
    fitView({ padding, duration: FIT_VIEW_DURATION_MS });
  }, FIT_VIEW_DEFER_MS);
  return () => clearTimeout(timer);
}
