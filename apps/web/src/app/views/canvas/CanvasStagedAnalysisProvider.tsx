/** Bind staged editors to the admitted connection and existing graph field-eligibility query. */
import { useMemo, type ReactNode } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { resolveCanvasReadFieldEligibility } from './canvasInputFieldEligibility';
import { resolveCanvasCompositionConnection } from './canvasCompositionConnection';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import styles from './CanvasStagedOperationInspector.module.css';

export type CanvasStagedAnalysisBinding = Readonly<{
  inputs: readonly CanvasDvtCompositionInput[];
  readFieldEligibility: (
    document: SubstraitDocument
  ) => ReturnType<typeof resolveCanvasReadFieldEligibility>;
}>;

export function CanvasStagedAnalysisProvider({
  binding,
  document,
  scope,
  children,
}: Readonly<{
  binding: CanvasStagedAnalysisBinding;
  document: SubstraitDocument | null;
  scope: string;
  children: ReactNode;
}>): JSX.Element | null {
  const context = useMemo(
    () => resolveCanvasCompositionConnection(document == null ? [] : [document], binding.inputs),
    [document, binding.inputs]
  );
  const eligibility = useMemo(
    () => (document == null ? null : binding.readFieldEligibility(document)),
    [document, binding.readFieldEligibility]
  );
  const available = context.state === 'available';
  const analysis = useCanvasRelationAnalysisSession(
    available ? document : null,
    scope,
    available ? context.connection : undefined,
    eligibility?.denied,
    eligibility?.disconnected
  );
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language).stagedAnalysis;
  if (document == null) return null;
  if (context.state === 'unavailable')
    return (
      <p role="alert" data-slot="canvas-staged-analysis-unavailable" className={styles.status}>
        {copy[context.reason]}
      </p>
    );
  return (
    <CanvasRelationAnalysisContext.Provider value={analysis}>
      {children}
    </CanvasRelationAnalysisContext.Provider>
  );
}
