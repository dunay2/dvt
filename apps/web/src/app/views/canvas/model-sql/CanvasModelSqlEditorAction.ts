/** Owns the Model-scoped presentation entry into its existing SQL authoring panel. */
import { createContext } from 'react';

export const CanvasModelSqlEditorAction = createContext<Readonly<{
  open: () => void;
  panelId: string;
  expanded: boolean;
}> | null>(null);
