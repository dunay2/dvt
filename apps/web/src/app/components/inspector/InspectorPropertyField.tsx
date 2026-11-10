/**
 * Owned concern: present a metadata label, value and optional edit action.
 * @baseline Inspector presentation keeps draft mutation in its existing authoring owner.
 * @decision Share passive inline/block composition and reuse the application Button.
 * @consequence Read-only fields expose no action; styling and editing state stay separate.
 * @version 1.0.0
 */
import type { JSX, ReactNode } from 'react';

import { Button } from '../ui/button';
import { inspectorVisualClasses } from './inspectorVisualTokens';
import styles from './InspectorMetadata.module.css';

type InspectorPropertyFieldProps = Readonly<{
  label: string;
  children: ReactNode;
  action: Readonly<{ label: string; onSelect: () => void }> | null;
  layout?: 'inline' | 'block';
  slot?: string;
}>;

export function InspectorPropertyField({
  label,
  children,
  action,
  layout = 'inline',
  slot,
}: InspectorPropertyFieldProps): JSX.Element {
  return (
    <div data-slot={slot} className={styles.field} data-layout={layout}>
      <span className={inspectorVisualClasses.inspectorLabel}>{label}</span>
      <div className={styles.fieldContent}>{children}</div>
      {action == null ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={styles.fieldAction}
          onClick={action.onSelect}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
