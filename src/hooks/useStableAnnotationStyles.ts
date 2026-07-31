import { useRef } from 'react';
import type { GraphAnnotationStyles } from '../types';

function annotationStylesEqual(
  a: GraphAnnotationStyles | undefined,
  b: GraphAnnotationStyles | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.backgroundColor === b.backgroundColor
    && a.className === b.className
    && a.deleteButton?.backgroundColor === b.deleteButton?.backgroundColor
    && a.deleteButton?.className === b.deleteButton?.className
    && a.deleteButton?.icon === b.deleteButton?.icon;
}

/** Keep a referentially stable annotationStyles object when values are unchanged. */
export function useStableAnnotationStyles(
  styles: GraphAnnotationStyles | undefined,
): GraphAnnotationStyles | undefined {
  const ref = useRef(styles);
  if (!annotationStylesEqual(ref.current, styles)) {
    ref.current = styles;
  }
  return ref.current;
}
