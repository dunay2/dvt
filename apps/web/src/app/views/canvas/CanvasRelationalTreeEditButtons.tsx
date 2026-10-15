/** Owned concern: render projected Apply/Cancel controls without transaction admission or state. */
import { Check, X } from 'lucide-react';
import type {
  CanvasRelationalTreeSessionActionsBinding,
  CanvasRelationalTreeSessionActionsModel,
} from './canvasRelationalTreeSessionActionsModel';
import styles from './CanvasRelationalTreeSessionActions.module.css';

export function CanvasRelationalTreeEditButtons({
  model,
  binding,
}: Readonly<{
  model: Pick<
    Extract<CanvasRelationalTreeSessionActionsModel, { kind: 'active' }>,
    'applyLabel' | 'cancelLabel' | 'applyDisabled'
  >;
  binding: Pick<CanvasRelationalTreeSessionActionsBinding, 'onApply' | 'onCancel'>;
}>): JSX.Element {
  return (
    <>
      <button
        type="button"
        data-slot="canvas-relational-tree-apply"
        aria-label={model.applyLabel}
        title={model.applyLabel}
        disabled={model.applyDisabled}
        onClick={binding.onApply}
        className={styles.applyButton}
      >
        <Check aria-hidden="true" className={styles.icon} />
      </button>
      <button
        type="button"
        data-slot="canvas-relational-tree-cancel"
        aria-label={model.cancelLabel}
        title={model.cancelLabel}
        onClick={binding.onCancel}
        className={styles.cancelButton}
      >
        <X aria-hidden="true" className={styles.icon} />
      </button>
    </>
  );
}
