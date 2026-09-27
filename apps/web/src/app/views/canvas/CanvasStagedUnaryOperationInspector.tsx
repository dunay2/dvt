/** Configure a staged unary operation without removing it from the graph. */
import { useMemo } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import {
  assignCanvasStagedRoot,
  decodeCanvasStagedOperation,
} from './canvasStagedOperationDocument';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { useSelectedRelationTool } from './useSelectedRelationTool';
import styles from './CanvasStagedOperationInspector.module.css';

export type ConfigurableStagedOperation = CanvasRelationalOperatorTool['id'];

export function CanvasStagedUnaryOperationInspector({
  operation,
  staged,
  producerDocument,
  copy,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  operation: ConfigurableStagedOperation;
  staged: CanvasStagedOperation;
  producerDocument: SubstraitDocument | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (semanticDocument: CanvasStagedOperation['semanticDocument']) => void;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element | null {
  const configured = useMemo(() => decodeCanvasStagedOperation(staged), [staged.semanticDocument]);
  const document = configured ?? producerDocument;
  const analysis = useCanvasRelationAnalysisSession(document, staged.id);
  const targetRelationId = configured == null ? (staged.inputs[0] ?? null) : staged.id;
  if (document == null || analysis == null || targetRelationId == null) return null;
  return (
    <CanvasRelationAnalysisContext.Provider value={analysis}>
      <StagedUnaryForm
        operation={operation}
        staged={staged}
        document={document}
        targetRelationId={targetRelationId}
        editing={configured != null}
        copy={copy}
        onChange={onChange}
        onClose={onClose}
        onPendingChange={onPendingChange}
      />
    </CanvasRelationAnalysisContext.Provider>
  );
}

function StagedUnaryForm({
  operation,
  staged,
  document,
  targetRelationId,
  editing,
  copy,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  operation: ConfigurableStagedOperation;
  staged: CanvasStagedOperation;
  document: SubstraitDocument;
  targetRelationId: string;
  editing: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (semanticDocument: CanvasStagedOperation['semanticDocument']) => void;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element | null {
  const selected = useSelectedRelationTool(
    targetRelationId,
    operation,
    editing ? 'edit' : 'insert'
  );
  if (selected == null) return null;
  const title = copy[resolveCanvasRelationalOperationPresentation(operation).labelKey];
  return (
    <aside data-slot="canvas-staged-operation-inspector" className={styles.inspector}>
      <h2 className={styles.title}>{title}</h2>
      <CanvasRelationalTreeOperatorForm
        tool={selected.tool}
        draft={document}
        title={title}
        targetRelationId={targetRelationId}
        inline
        onPendingChange={onPendingChange}
        onClose={onClose}
        onChange={(next) =>
          onChange(encodeDvtSubstraitSemanticDocument(assignCanvasStagedRoot(next, staged.id)))
        }
      />
    </aside>
  );
}
