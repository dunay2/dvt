/**
 * Owned concern: present one controlled identity selector in a field or on its icon.
 * @decision Callers own compatibility, permissions and persistence; this control owns disclosure.
 * @consequence Pointer and keyboard interaction cannot escape into Canvas gestures.
 */
import type { JSX, SyntheticEvent } from 'react';
import type {
  CanvasModelIconPreference,
  ModelIdentity,
} from '../../views/canvas/canvasModelIdentity';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../ui/utils';
import { ModelIdentityIcon, MODEL_IDENTITY_LABELS } from './ModelIdentityIcon';
import styles from './ModelIdentity.module.css';

export type ModelIdentitySelectProps = Readonly<{
  identity: ModelIdentity;
  onChange?: (preference: CanvasModelIconPreference) => void;
  label?: string;
  modelName?: string;
  presentation?: 'field' | 'icon';
  size?: 'compact' | 'header';
  invalid?: boolean;
  describedBy?: string;
}>;

function isolateGesture(event: SyntheticEvent): void {
  event.stopPropagation();
  if (event.type === 'contextmenu') event.preventDefault();
}

export function ModelIdentitySelect({
  identity,
  onChange,
  label,
  modelName,
  presentation = 'field',
  size = 'compact',
  invalid,
  describedBy,
}: ModelIdentitySelectProps): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const spanish = language.startsWith('es');
  const accessibleLabel =
    label ?? [spanish ? 'Cambiar icono' : 'Change icon', modelName].filter(Boolean).join(': ');
  const iconLabel = (icon: ModelIdentity['icon']) =>
    icon === 'model' && spanish ? 'Modelo' : MODEL_IDENTITY_LABELS[icon];
  const automaticLabel = `${spanish ? 'Automático' : 'Automatic'} · ${iconLabel(identity.automaticIcon)}`;
  if (onChange == null)
    return (
      <span
        className={styles.choice}
        title={iconLabel(identity.icon)}
        role={presentation === 'icon' ? 'img' : undefined}
        aria-label={presentation === 'icon' ? iconLabel(identity.icon) : undefined}
      >
        <ModelIdentityIcon icon={identity.icon} size={size} />
        {presentation === 'field' ? iconLabel(identity.icon) : null}
      </span>
    );
  return (
    <Select
      value={identity.preference}
      onValueChange={(value) => {
        if (value === 'auto' || identity.choices.some((choice) => choice === value))
          onChange(value as CanvasModelIconPreference);
      }}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          presentation === 'icon' ? styles.iconTrigger : styles.trigger,
          'nodrag',
          'nopan'
        )}
        data-model-icon-trigger={presentation}
        data-identity-size={size}
        aria-label={accessibleLabel}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        title={
          presentation === 'icon' ? `${accessibleLabel} · ${iconLabel(identity.icon)}` : undefined
        }
        onPointerDown={isolateGesture}
        onClick={isolateGesture}
        onDoubleClick={isolateGesture}
        onKeyDown={isolateGesture}
        onContextMenu={isolateGesture}
      >
        {presentation === 'icon' ? (
          <ModelIdentityIcon icon={identity.icon} size={size} />
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent
        className="nodrag nopan"
        onPointerDown={isolateGesture}
        onClick={isolateGesture}
        onDoubleClick={isolateGesture}
        onKeyDown={isolateGesture}
        onContextMenu={isolateGesture}
      >
        <SelectItem value="auto" className={styles.option}>
          <span className={styles.choice}>
            <ModelIdentityIcon icon={identity.automaticIcon} />
            {automaticLabel}
          </span>
        </SelectItem>
        {identity.choices.map((icon) => (
          <SelectItem key={icon} value={icon} className={styles.option}>
            <span className={styles.choice}>
              <ModelIdentityIcon icon={icon} />
              {iconLabel(icon)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
