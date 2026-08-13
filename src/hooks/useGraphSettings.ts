import { createContext, useContext } from 'react';

import type { GraphAnnotationStyles, GraphHoverStyles } from '../types';

export const DEFAULT_DIMMED_OPACITY = 0.3;

export interface GraphSettings {
  multiEdgeSpacing: number;
  annotationStyles?: GraphAnnotationStyles;
  hoverStyles?: GraphHoverStyles;
}

const defaults: GraphSettings = {
  multiEdgeSpacing: 60,
};

export const GraphSettingsContext = createContext<GraphSettings>(defaults);

export function useGraphSettings(): GraphSettings {
  return useContext(GraphSettingsContext);
}
