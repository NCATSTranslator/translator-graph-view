import { createContext, useContext } from 'react';

import type { GraphAnnotationStyles } from '../types';

export interface GraphSettings {
  multiEdgeSpacing: number;
  annotationStyles?: GraphAnnotationStyles;
}

const defaults: GraphSettings = {
  multiEdgeSpacing: 60,
};

export const GraphSettingsContext = createContext<GraphSettings>(defaults);

export function useGraphSettings(): GraphSettings {
  return useContext(GraphSettingsContext);
}
