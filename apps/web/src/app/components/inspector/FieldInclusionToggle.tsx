/** Owned concern: present the existing field inclusion action without owning selection or mutations. */
import { Plus, X } from 'lucide-react';
import { inspectorVisualClasses } from './inspectorVisualTokens';

export function FieldInclusionToggle({
  included,
  disabled,
  busy = false,
  label,
  title,
  fieldName,
  slot,
  onChange,
}: Readonly<{
  included: boolean;
  disabled: boolean;
  busy?: boolean;
  label: string;
  title: string;
  fieldName: string;
  slot: string;
  onChange?: (included: boolean) => void;
}>): JSX.Element {
  return (
    <button
      type="button"
      data-slot={slot}
      data-field-name={fieldName}
      data-included={included}
      disabled={disabled || onChange == null}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      aria-pressed={included}
      aria-label={label}
      title={title}
      className={inspectorVisualClasses.inspectorFieldInclusionButton}
      onClick={(event) => {
        event.stopPropagation();
        if (!busy) onChange?.(!included);
      }}
    >
      {included ? (
        <X aria-hidden="true" className={inspectorVisualClasses.inspectorFieldInclusionIcon} />
      ) : (
        <Plus aria-hidden="true" className={inspectorVisualClasses.inspectorFieldInclusionIcon} />
      )}
    </button>
  );
}
