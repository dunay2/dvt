/** Owned concern: expose consent presentation to the toolbar and affected cards, not graph writes. */
import { createContext } from 'react';
import type { CanvasCardRemovalProposal } from './canvasCardRemoval';
import type { CanvasCardRemovalRejection } from './CanvasCardRemovalError';

export const CanvasCardRemovalContext = createContext<Readonly<{
  pending: Pick<
    CanvasCardRemovalProposal,
    'target' | 'dependents' | 'affectedIds' | 'disconnectsOutput'
  > | null;
  error: CanvasCardRemovalRejection | null;
  confirm: () => void;
  cancel: () => void;
  clearError: () => void;
}> | null>(null);
