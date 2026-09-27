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
import { CanvasSelectedUnaryEditor } from './CanvasSelectedUnaryEditor';
import type { CanonicalNode } from '../../types/canonical';
import styles from './CanvasStagedOperationInspector.module.css';

export type ConfigurableStagedOperation = CanvasRelationalOperatorTool['id'];

export function CanvasStagedUnaryOperationInspector({
  operation,
  staged,
  editingDocument,
  producerDocument,
  transformNode,
  copy,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  operation: ConfigurableStagedOperation;
  staged: CanvasStagedOperation;
  editingDocument?: SubstraitDocument | null;
  producerDocument: SubstraitDocument | null;
  transformNode: CanonicalNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (semanticDocument: CanvasStagedOperation['semanticDocument']) => void | boolean;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element | null {
  const configured = useMemo(
    () => editingDocument ?? decodeCanvasStagedOperation(staged),
    [editingDocument, staged.semanticDocument]
  );
  const document = configured ?? producerDocument;
  const analysis = useCanvasRelationAnalysisSession(document, staged.id);
  const targetRelationId = configured == null ? (staged.inputs[0] ?? null) : staged.id;
  if (document == null || analysis == null || targetRelationId == null) return null;
  return (
    <CanvasRelationAnalysisContext.Provider value={analysis}>
      {configured != null ? (
        <CanvasSelectedUnaryEditor
          draft={document}
          operation={operation}
          relationId={staged.id}
          transformNode={transformNode}
          onClose={onClose}
          onPendingChange={onPendingChange}
          onChange={(next) => onChange(encodeDvtSubstraitSemanticDocument(next))}
        />
      ) : (
        <StagedUnaryForm
          operation={operation}
          staged={staged}
          document={document}
          targetRelationId={targetRelationId}
          copy={copy}
          onChange={onChange}
          onClose={onClose}
          onPendingChange={onPendingChange}
        />
      )}
    </CanvasRelationAnalysisContext.Provider>
  );
}

function StagedUnaryForm({
  operation,
  staged,
  document,
  targetRelationId,
  copy,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  operation: ConfigurableStagedOperation;
  staged: CanvasStagedOperation;
  document: SubstraitDocument;
  targetRelationId: string;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (semanticDocument: CanvasStagedOperation['semanticDocument']) => void | boolean;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element | null {
  const selected = useSelectedRelationTool(targetRelationId, operation, 'insert');
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
