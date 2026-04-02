import { createContext, useContext } from 'react';

export interface GraphSettings {
  multiEdgeSpacing: number;
}

const defaults: GraphSettings = {
  multiEdgeSpacing: 60,
};

export const GraphSettingsContext = createContext<GraphSettings>(defaults);

export function useGraphSettings(): GraphSettings {
  return useContext(GraphSettingsContext);
}
