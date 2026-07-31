import { createContext, useContext } from 'react';

export interface AnnotationActions {
  onTextChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  readOnly: boolean;
}

const noop = (): void => {};

export const readOnlyAnnotationActions: AnnotationActions = {
  onTextChange: noop,
  onDelete: noop,
  readOnly: true,
};

export const AnnotationActionsContext = createContext<AnnotationActions>(
  readOnlyAnnotationActions,
);

export function useAnnotationActions(): AnnotationActions {
  return useContext(AnnotationActionsContext);
}
