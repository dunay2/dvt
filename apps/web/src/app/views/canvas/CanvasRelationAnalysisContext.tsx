/** One Workbench shares its owned analysis; this context never authorizes source access. */
import { createContext } from 'react';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

export const CanvasRelationAnalysisContext =
  createContext<ReturnType<typeof useCanvasRelationAnalysisSession>>(null);
