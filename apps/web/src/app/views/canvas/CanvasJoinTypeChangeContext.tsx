/** Supply only the working-copy authorities that may accept a configured JOIN type change. */
import { createContext } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasStagedAnalysisBinding } from './CanvasStagedAnalysisProvider';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasStagedOperationActions } from './canvasStagedOperationActions';

export type CanvasJoinTypeChangeAuthority = Readonly<{
  changeDraft: (document: SubstraitDocument) => boolean | void;
  analysisBinding: CanvasStagedAnalysisBinding;
  stagedOperations: readonly CanvasStagedOperation[];
  updateStagedOperation: CanvasStagedOperationActions['updateConfiguration'];
}>;

export const CanvasJoinTypeChangeContext = createContext<CanvasJoinTypeChangeAuthority | null>(
  null
);
