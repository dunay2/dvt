/** Route a selected staged operation to its specific property editor. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasStagedBinaryInspector } from './CanvasStagedBinaryInspector';
import { CanvasStagedTransformInspector } from './CanvasStagedTransformInspector';
import {
  CanvasStagedUnaryOperationInspector,
  type ConfigurableStagedOperation,
} from './CanvasStagedUnaryOperationInspector';
import {
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import styles from './CanvasStagedOperationInspector.module.css';


export function CanvasStagedOperationInspector({
  staged,
  editingDocument,
  producerDocument,
  transformNode,
  copy,
  onClose,
  onPendingChange,
  onUpdate,
}: Readonly<{
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
}>): JSX.Element {
  if (
    (isCanvasJoinOperation(staged.operation) ||
      isCanvasSetOperation(staged.operation) ||
      staged.operation === 'cross_join') &&
    staged.semanticDocument != null
  )
    return (
      <CanvasStagedBinaryInspector
        staged={staged}
        editingDocument={editingDocument}
        copy={copy}
        onChange={onUpdate}
        onPendingChange={onPendingChange}
        onClose={onClose}
        transformNode={transformNode}
      />
    );
  if (editor === 'transform' && staged.semanticDocument != null)
    return (
      <CanvasStagedTransformInspector
        staged={staged}
        editingDocument={editingDocument}
        transformNode={transformNode}
        onClose={onClose}
        onPendingChange={onPendingChange}
        onChange={(semanticDocument) =>
          onUpdate({ operation: staged.operation, semanticDocument })
        }
      />
    );
  if (editor === 'unary' && producerDocument != null)
    return (
      <CanvasStagedUnaryOperationInspector
        operation={staged.operation as ConfigurableStagedOperation}
        staged={staged}
        editingDocument={editingDocument}
        producerDocument={producerDocument}
        transformNode={transformNode}
        copy={copy}
        onClose={onClose}
        onPendingChange={onPendingChange}
        onChange={(semanticDocument) => onUpdate({ operation: staged.operation, semanticDocument })}
      />
    );
  return <CanvasStagedOperationProperties staged={staged} copy={copy} />;
}

function CanvasStagedOperationProperties({
  staged,
  copy,
}: Readonly<{
  staged: CanvasStagedOperation;
  copy: CanvasRelationalTreeWorkbenchCopy;
}>): JSX.Element {
  const title = copy[resolveCanvasRelationalOperationPresentation(staged.operation).labelKey];
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
            <dt className={styles.inputLabel}>{inputLabel(staged, port, copy)}</dt>
            <dd className={styles.inputValue}>
              {connected == null
                ? copy.relationalTreeMissingLabel
                : copy.relationalTreeParticipatingLabel}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function inputLabel(
  staged: CanvasStagedOperation,
  port: number,
  copy: CanvasRelationalTreeWorkbenchCopy
): string {
  if (staged.inputs.length === 1) return copy.relationalTreePrimaryInputLabel;
  return port === 0 ? copy.inspectorDvtRelationalLeftInput : copy.inspectorDvtRelationalRightInput;
}
