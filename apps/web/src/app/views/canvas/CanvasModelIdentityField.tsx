/** Compose either identity field presentation with the existing Inspector draft submission rail. */
import { useId, type JSX } from 'react';
import { toast } from 'sonner';
import { InspectorPropertyField } from '../../components/inspector/InspectorPropertyField';
import { ModelIdentitySelect } from '../../components/inspector/ModelIdentitySelect';
import styles from '../../components/inspector/ModelIdentity.module.css';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasModelIdentity } from './canvasModelIdentity';
import { useCanvasInspectorDraftSubmission } from './useCanvasInspectorDraftSubmission';

const COPY = {
  en: { label: 'Icon', blocked: 'Resolve the pending property errors before saving.' },
  es: {
    label: 'Icono',
    blocked: 'Corrige los errores pendientes de las propiedades antes de guardar.',
  },
};

export function CanvasModelIdentityField({
  presentation = 'field',
  ...props
}: Parameters<typeof useCanvasInspectorDraftSubmission>[0] & {
  presentation?: 'field' | 'icon';
}): JSX.Element | null {
  const { node, authoring, draftController } = props;
  const { commitDraft, errors, isDirty } = useCanvasInspectorDraftSubmission(props);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = language.startsWith('es') ? COPY.es : COPY.en;
  const hintId = useId();
  const identity = resolveCanvasModelIdentity({
    ...node,
    metadata: { ...node.metadata, modelIcon: draftController.draft.modelIcon },
  });
  if (identity == null) return null;
  const hasErrors = isDirty && Object.keys(errors).length > 0;
  const control = (
    <ModelIdentitySelect
      identity={identity}
      modelName={node.name}
      label={presentation === 'field' ? copy.label : undefined}
      presentation={presentation}
      size={presentation === 'icon' ? 'header' : 'compact'}
      invalid={hasErrors}
      describedBy={hasErrors && presentation === 'field' ? hintId : undefined}
      onChange={
        authoring.canEditNode
          ? (value) => {
              if (
                !commitDraft({ ...draftController.draft, modelIcon: value }) &&
                presentation === 'icon'
              )
                toast.error(copy.blocked);
            }
          : undefined
      }
    />
  );
  if (presentation === 'icon') return control;
  return (
    <div className={styles.field} data-slot="canvas-model-identity-field">
      <InspectorPropertyField label={copy.label} action={null}>
        {control}
      </InspectorPropertyField>
      {hasErrors ? (
        <p id={hintId} role="status" className={styles.hint}>
          {copy.blocked}
        </p>
      ) : null}
    </div>
  );
}
