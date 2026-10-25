/** Route a selected staged operation to its specific property editor. */
import { useMemo, useState, type ReactElement } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasStagedCompositionInspector } from './CanvasStagedCompositionInspector';
import { CanvasStagedTransformInspector } from './CanvasStagedTransformInspector';
import {
  CanvasStagedUnaryOperationInspector,
  type ConfigurableStagedOperation,
} from './CanvasStagedUnaryOperationInspector';
import {
  readCanvasStagedCompositionSignature,
  deriveCanvasStagedCompositionState,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import styles from './CanvasStagedOperationInspector.module.css';
import { canvasRelationalInputPortLabel } from './canvasRelationalInputPorts';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import {
  CanvasStagedAnalysisProvider,
  type CanvasStagedAnalysisBinding,
} from './CanvasStagedAnalysisProvider';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasStagedOperationInspector({
  binding,
  staged,
  editingDocument,
  producerDocument,
  transformNode,
  copy,
  onClose,
  onPendingChange,
  onUpdate,
  onReconfigure,
}: Readonly<{
  binding: CanvasStagedAnalysisBinding;
  staged: CanvasStagedOperation;
  editingDocument?: SubstraitDocument | null;
  producerDocument: SubstraitDocument | null;
  transformNode: CanonicalNode;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
  onUpdate: (
    update: Pick<CanvasStagedOperation, 'operation' | 'semanticDocument'>
  ) => void | boolean;
  onReconfigure?: () => boolean;
}>): JSX.Element {
  const editor = readCanvasStagedCompositionSignature(staged.operation).editor;
  const configured = useMemo(
    () => editingDocument ?? decodeCanvasStagedOperation(staged),
    [editingDocument, staged]
  );
  let content: ReactElement | null = null;
  if (editor === 'composition' && staged.semanticDocument != null && configured != null)
    content = (
      <CanvasStagedCompositionInspector
        staged={staged}
        document={configured}
        copy={copy}
        onChange={onUpdate}
        onPendingChange={onPendingChange}
        onClose={onClose}
        transformNode={transformNode}
      />
    );
  else if (editor === 'transform' && staged.semanticDocument != null && configured != null)
    content = (
      <CanvasStagedTransformInspector
        staged={staged}
        document={configured}
        transformNode={transformNode}
        onClose={onClose}
        onPendingChange={onPendingChange}
        onChange={(semanticDocument) => onUpdate({ operation: staged.operation, semanticDocument })}
      />
    );
  else if (editor === 'unary' && producerDocument != null)
    content = (
      <CanvasStagedUnaryOperationInspector
        operation={staged.operation as ConfigurableStagedOperation}
        staged={staged}
        editingDocument={configured}
        producerDocument={producerDocument}
        transformNode={transformNode}
        copy={copy}
        onClose={onClose}
        onPendingChange={onPendingChange}
        onChange={(semanticDocument) => onUpdate({ operation: staged.operation, semanticDocument })}
      />
    );
  return content == null ? (
    <CanvasStagedOperationProperties
      key={staged.id}
      staged={staged}
      copy={copy}
      onReconfigure={onReconfigure}
    />
  ) : (
    <CanvasStagedAnalysisProvider
      binding={binding}
      document={configured ?? producerDocument}
      scope={staged.id}
    >
      {content}
    </CanvasStagedAnalysisProvider>
  );
}

function CanvasStagedOperationProperties({
  staged,
  copy,
  onReconfigure,
}: Readonly<{
  staged: CanvasStagedOperation;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onReconfigure?: () => boolean;
}>): JSX.Element {
  const title = copy[resolveCanvasRelationalOperationPresentation(staged.operation).labelKey];
  const language = useApplicationLanguageStore((state) => state.language);
  const recoveryCopy = resolveCanvasSemanticEditorCopy(language).joinRecovery;
  const [rejected, setRejected] = useState(false);
  const retainedJoin =
    staged.configurationDocument != null &&
    readCanvasStagedCompositionSignature(staged.operation).operator === 'join';
  return (
    <aside data-slot="canvas-staged-operation-inspector" className={styles.inspector}>
      <p className={styles.eyebrow}>{copy.canvasNodeContextPropertiesLabel}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.status}>{copy.relationalTreePendingLabel}</p>
      <dl className={styles.inputs}>
        {staged.inputs.map((connected, port) => (
          <div
            key={port}
            data-slot="canvas-staged-operation-input-property"
            data-port={port}
            className={styles.input}
          >
            <dt className={styles.inputLabel}>
              {canvasRelationalInputPortLabel(staged, port, copy)}
            </dt>
            <dd className={styles.inputValue}>
              {connected == null
                ? copy.relationalTreeMissingLabel
                : copy.relationalTreeParticipatingLabel}
            </dd>
          </div>
        ))}
      </dl>
      {retainedJoin && onReconfigure != null ? (
        <div className={styles.recovery}>
          <p>{recoveryCopy.hint}</p>
          <button
            type="button"
            data-slot="canvas-staged-operation-reconfigure"
            className={styles.reconfigure}
            disabled={deriveCanvasStagedCompositionState(staged) !== 'ready'}
            onClick={() => setRejected(!onReconfigure())}
          >
            {recoveryCopy.action}
          </button>
          {rejected ? (
            <p role="alert" className={styles.status}>
              {recoveryCopy.failed}
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
