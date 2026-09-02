import type { GraphAnnotationStyles } from '../types';
import { useStableValue } from './useStableValue';

function annotationStylesEqual(a: GraphAnnotationStyles, b: GraphAnnotationStyles): boolean {
  return a.backgroundColor === b.backgroundColor
    && a.className === b.className
    && a.deleteButton?.backgroundColor === b.deleteButton?.backgroundColor
    && a.deleteButton?.className === b.deleteButton?.className
    && a.deleteButton?.icon === b.deleteButton?.icon
    && a.linkify === b.linkify
    && a.linkClassName === b.linkClassName;
}

/** Keep a referentially stable annotationStyles object when values are unchanged. */
export function useStableAnnotationStyles(
  styles: GraphAnnotationStyles | undefined,
): GraphAnnotationStyles | undefined {
  return useStableValue(styles, annotationStylesEqual);
}
