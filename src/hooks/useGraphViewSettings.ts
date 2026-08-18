import { useMemo } from 'react';

import type { GraphAnnotationStyles, GraphHoverStyles } from '../types';
import { useStableAnnotationStyles } from './useStableAnnotationStyles';
import { useStableHoverStyles } from './useStableHoverStyles';
import type { GraphSettings } from './useGraphSettings';

interface UseGraphViewSettingsOptions {
  multiEdgeSpacing?: number;
  annotationStyles?: GraphAnnotationStyles;
  hoverStyles?: GraphHoverStyles;
}

/** Build a referentially stable GraphSettings value for the settings context. */
export function useGraphViewSettings({
  multiEdgeSpacing,
  annotationStyles,
  hoverStyles,
}: UseGraphViewSettingsOptions): GraphSettings {
  const stableAnnotationStyles = useStableAnnotationStyles(annotationStyles);
  const stableHoverStyles = useStableHoverStyles(hoverStyles);

  return useMemo(
    () => ({
      multiEdgeSpacing: multiEdgeSpacing ?? 60,
      annotationStyles: stableAnnotationStyles,
      hoverStyles: stableHoverStyles,
    }),
    [multiEdgeSpacing, stableAnnotationStyles, stableHoverStyles],
  );
}
