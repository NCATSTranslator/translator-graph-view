import type { GraphHoverStyles } from '../types';
import { useStableValue } from './useStableValue';

function hoverStylesEqual(a: GraphHoverStyles, b: GraphHoverStyles): boolean {
  return (
    a.dimmedOpacity === b.dimmedOpacity
    && a.dimmedNodeClassName === b.dimmedNodeClassName
    && a.dimmedEdgeClassName === b.dimmedEdgeClassName
    && a.dimmedAnnotationClassName === b.dimmedAnnotationClassName
    && a.hoveredNodeClassName === b.hoveredNodeClassName
    && a.hoveredEdgeClassName === b.hoveredEdgeClassName
    && a.hoveredAnnotationClassName === b.hoveredAnnotationClassName
  );
}

/** Keep a referentially stable hoverStyles object when values are unchanged. */
export function useStableHoverStyles(
  styles: GraphHoverStyles | undefined,
): GraphHoverStyles | undefined {
  return useStableValue(styles, hoverStylesEqual);
}
