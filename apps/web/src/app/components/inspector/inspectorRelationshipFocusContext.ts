/** Accept relationship focus commands from the currently mounted viewport. */
import { createContext } from 'react';

export const InspectorRelationshipFocusContext = createContext<((nodeId: string) => void) | null>(
  null
);
