/**
 * Owned concern: render projected session actions through existing portal and dialog adapters.
 * @baseline GH-3629: presentation cannot resolve transaction or navigation policy.
 * @decision Consume only the UI model, explicit callbacks and concern-owned stylesheet.
 * @consequence Apply/Cancel and leave decisions remain with their existing command owners.
 */
import { createPortal } from 'react-dom';
import { CanvasDraftDecisionDialog } from './CanvasDraftDecisionDialog';
import { CanvasRelationalTreeEditButtons } from './CanvasRelationalTreeEditButtons';
import type {
  CanvasRelationalTreeSessionActionsBinding,
  CanvasRelationalTreeSessionActionsModel,
} from './canvasRelationalTreeSessionActionsModel';
import styles from './CanvasRelationalTreeSessionActions.module.css';

export function CanvasRelationalTreeSessionActions({
  model,
  binding,
  host,
}: Readonly<{
  model: CanvasRelationalTreeSessionActionsModel;
  binding: CanvasRelationalTreeSessionActionsBinding;
  host?: HTMLElement | null;
}>): JSX.Element | null {
  if (model.kind === 'hidden') return null;
  const actions = (
    <div className={styles.actions}>
      {model.rejectionMessage == null ? null : (
        <span role="alert" className={styles.rejection}>
          {model.rejectionMessage}
        </span>
      )}
      {model.draftLabel == null ? null : (
        <span role="status" className={styles.draft}>
          {model.draftLabel}
        </span>
      )}
      <CanvasRelationalTreeEditButtons model={model} binding={binding} />
    </div>
  );
  return (
    <>
      <CanvasDraftDecisionDialog
        open={model.decision.open}
        canApply={model.decision.canApply}
        onStay={binding.onStay}
        onDiscard={binding.onDiscard}
        onApply={binding.onApplyAndNavigate}
        error={model.rejectionMessage}
      />
      {host ? createPortal(actions, host) : <div className={styles.fallback}>{actions}</div>}
    </>
  );
}
