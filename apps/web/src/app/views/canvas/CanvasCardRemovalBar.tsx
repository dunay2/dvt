/**
 * Owned concern: present inline consent and keyboard focus without a modal or semantic decisions.
 * @baseline GH-3606: the Canvas and inspector remain visible throughout confirmation.
 * @decision Use normal toolbar flow and restore focus to the originating card when it survives.
 * @consequence Escape/Cancel are non-destructive; only the explicit action confirms.
 * @version 1.0.0
 */
import { useLayoutEffect, useRef } from 'react';
import styles from './CanvasCardRemovalBar.module.css';

export function CanvasCardRemovalBar({
  targetId,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: Readonly<{
  targetId?: string;
  title: string;
  description?: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm?: () => void;
}>): JSX.Element {
  const bar = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const element = bar.current;
    const workspace = element?.closest<HTMLElement>(
      '[data-slot="canvas-relational-tree-workbench"]'
    );
    cancel.current?.focus();
    return () => {
      if (!element?.contains(document.activeElement)) return;
      const card = [
        ...(workspace?.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-tree-node"]') ??
          []),
      ].find((node) => node.dataset.relationId === targetId);
      (card ?? workspace)?.focus();
    };
  }, [targetId]);
  return (
    <div
      ref={bar}
      role="region"
      aria-label={title}
      data-slot="canvas-card-removal-bar"
      className={styles.bar}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }}
    >
      <div className={styles.message} aria-live="polite">
        <strong>{title}</strong>
        {description == null ? null : <span>{description}</span>}
      </div>
      <div className={styles.actions}>
        <button
          ref={cancel}
          type="button"
          data-slot="canvas-card-removal-cancel"
          onClick={onCancel}
          className={styles.cancel}
        >
          {cancelLabel}
        </button>
        {onConfirm == null ? null : (
          <button
            type="button"
            data-slot="canvas-card-removal-confirm"
            onClick={onConfirm}
            className={styles.confirm}
          >
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  );
}
