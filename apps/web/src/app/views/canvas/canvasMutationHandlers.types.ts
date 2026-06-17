import type { Edge, EdgeChange, NodeChange } from '@xyflow/react';

import type { ImportSourcesResult } from '../../ports/workspace';
import type {
  CanvasSourceImportCompletionContext,
  CanvasMutationEffects,
  CanvasMutationPolicy,
  CanvasMutationState,
} from './canvasMutationHandlerContracts';

export type UseCanvasMutationHandlersArgs = CanvasMutationState &
  CanvasMutationEffects &
  CanvasMutationPolicy;

export type CanvasGraphChangeHandlers = {
  handleNodesChange: (changes: NodeChange[]) => void;
  handleEdgesChange: (changes: EdgeChange<Edge>[]) => void;
};

export type CanvasSourceImportHandlers = {
  importedNodeFocusIds: string[];
  handleSourceImportComplete: (
    result: ImportSourcesResult,
    context?: CanvasSourceImportCompletionContext
  ) => void;
  handleImportedNodeFocusComplete: () => void;
};
