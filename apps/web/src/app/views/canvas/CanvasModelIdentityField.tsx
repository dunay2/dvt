/** Compose the compatible identity selector with the existing Inspector draft submission rail. */
import { useId, type JSX } from 'react';
import { InspectorPropertyField } from '../../components/inspector/InspectorPropertyField';
import {
  ModelIdentityIcon,
  MODEL_IDENTITY_LABELS,
} from '../../components/inspector/ModelIdentityIcon';
import styles from '../../components/inspector/ModelIdentity.module.css';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { isCanvasModelIconAllowed, resolveCanvasModelIdentity } from './canvasModelIdentity';
import { useCanvasInspectorDraftSubmission } from './useCanvasInspectorDraftSubmission';

const COPY = {
  en: {
    label: 'Icon',
    auto: 'Automatic',
    model: 'Model',
    blocked: 'Resolve the pending property errors before saving.',
  },
  es: {
    label: 'Icono',
    auto: 'Automático',
    model: 'Modelo',
    blocked: 'Corrige los errores pendientes de las propiedades antes de guardar.',
  },
};

export function CanvasModelIdentityField(
  props: Parameters<typeof useCanvasInspectorDraftSubmission>[0]
): JSX.Element | null {
  const { node, authoring, draftController } = props;
  const { commitDraft, errors, isDirty } = useCanvasInspectorDraftSubmission(props);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = language.startsWith('es') ? COPY.es : COPY.en;
  const hintId = useId();
  const identity = resolveCanvasModelIdentity(node);
  if (identity == null) return null;
  const automaticIcon = resolveCanvasModelIdentity({
    ...node,
    metadata: { ...node.metadata, modelIcon: undefined },
  })!.icon;
  const label = (icon: typeof identity.icon): string =>
    icon === 'model' ? copy.model : MODEL_IDENTITY_LABELS[icon];
  const hasErrors = isDirty && Object.keys(errors).length > 0;
  return (
    <div className={styles.field} data-slot="canvas-model-identity-field">
      <InspectorPropertyField label={copy.label} action={null}>
        {authoring.canEditNode ? (
          <Select
            value={draftController.draft.modelIcon ?? 'auto'}
            onValueChange={(value) => {
              if (isCanvasModelIconAllowed(node, value))
                commitDraft({ ...draftController.draft, modelIcon: value });
            }}
          >
            <SelectTrigger
              size="sm"
              className={styles.trigger}
              aria-label={copy.label}
              aria-describedby={hasErrors ? hintId : undefined}
              aria-invalid={hasErrors}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto" className={styles.option}>
                <span className={styles.choice}>
                  <ModelIdentityIcon icon={automaticIcon} />
                  {copy.auto} · {label(automaticIcon)}
                </span>
              </SelectItem>
              {identity.choices.map((icon) => (
                <SelectItem key={icon} value={icon} className={styles.option}>
                  <span className={styles.choice}>
                    <ModelIdentityIcon icon={icon} />
                    {label(icon)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={styles.choice}>
            <ModelIdentityIcon icon={identity.icon} />
            {label(identity.icon)}
          </span>
        )}
      </InspectorPropertyField>
      {hasErrors ? (
        <p id={hintId} role="status" className={styles.hint}>
          {copy.blocked}
        </p>
      ) : null}
    </div>
  );
}
