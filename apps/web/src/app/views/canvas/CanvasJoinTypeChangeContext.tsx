/** Supply only the working-copy authorities that may accept a configured JOIN type change. */
import { createContext, type PropsWithChildren } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasStagedAnalysisBinding } from './CanvasStagedAnalysisProvider';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasStagedOperationActions } from './canvasStagedOperationActions';
import type { projectCanvasRelationalTreeAuthoringView } from './canvasRelationalTreeAuthoringView';

export type CanvasJoinTypeChangeAuthority = Readonly<{
  changeDraft: (document: SubstraitDocument) => boolean | void;
  analysisBinding: CanvasStagedAnalysisBinding;
  stagedOperations: readonly CanvasStagedOperation[];
  updateStagedOperation: CanvasStagedOperationActions['updateConfiguration'];
}>;

export const CanvasJoinTypeChangeContext = createContext<CanvasJoinTypeChangeAuthority | null>(
  null
);

export function CanvasJoinTypeChangeProvider({
  enabled,
  view,
  children,
}: PropsWithChildren<{
  enabled: boolean;
  view: ReturnType<typeof projectCanvasRelationalTreeAuthoringView>;
}>): JSX.Element {
  const authority = enabled
    ? {
        changeDraft: view.actions.changeDraft,
        analysisBinding: view.data.analysisBinding,
        stagedOperations: view.data.stagedOperations,
        updateStagedOperation: view.actions.updateStagedOperation,
      }
    : null;
  return (
    <CanvasJoinTypeChangeContext.Provider value={authority}>
      {children}
    </CanvasJoinTypeChangeContext.Provider>
  );
}
