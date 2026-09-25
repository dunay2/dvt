/** Native materialization controls, independent of relational authoring. */
import type { Dispatch, SetStateAction } from 'react';
import { Label } from '../../components/ui/label';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import type {
  DvtSubstraitTransformAuthoringMetadata,
  DvtUninitializedTransformAuthoringMetadata,
} from './canvasDvtAuthoringModel';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import { canvasViewCopy } from './copy';

type DvtTransformAuthoringMetadata =
  DvtUninitializedTransformAuthoringMetadata | DvtSubstraitTransformAuthoringMetadata;

export function DvtTransformMaterializationField({
  disabled,
  draft,
  errors,
  onChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtTransformAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dvt'];
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const options = [
    { value: 'view', label: canvasViewCopy.inspectorDvtMaterializationViewLabel },
    { value: 'table', label: canvasViewCopy.inspectorDvtMaterializationTableLabel },
  ] as const;

  return (
    <div className="space-y-2">
      <Label htmlFor="dvt-transform-materialization">
        {canvasViewCopy.inspectorDvtMaterializationLabel}
      </Label>
      <select
        id="dvt-transform-materialization"
        name="dvt-transform-materialization"
        value={draft.materialized}
        disabled={disabled}
        className={inspectorVisualClasses.inspectorSelectInput}
        aria-invalid={errors?.materialization ? 'true' : undefined}
        aria-describedby={
          errors?.materialization ? 'dvt-transform-materialization-error' : undefined
        }
        onChange={(event) =>
          onChange((current) =>
            current.dvt?.kind === 'transform'
              ? { ...current, dvt: { ...current.dvt, materialized: event.target.value } }
              : current
          )
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errors?.materialization ? (
        <p
          id="dvt-transform-materialization-error"
          className={inspectorVisualClasses.inspectorErrorText}
          role="alert"
        >
          {formatCanvasInspectorNodeDraftError(errors.materialization, canvasViewCopy)}
        </p>
      ) : null}
    </div>
  );
}
