/** Owned concern: render accessible general node metadata around plugin-owned fields. */
import type { ReactNode } from 'react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import type { CanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';
import { canvasViewCopy } from './copy';

type MetadataField = 'name' | 'tags' | 'description';
type MetadataModel = Readonly<{
  nodeId: string;
  draft: CanvasInspectorNodeDraft;
  tagsText: string;
  errors: CanvasInspectorNodeDraftErrors;
  disabled: boolean;
  visible: boolean;
}>;
type MetadataActions = Pick<
  CanvasNodeWorkbenchDraftController,
  'onDraftChange' | 'onTagsTextChange'
> &
  Readonly<{ onBlur: () => void }>;
type MetadataProps = Readonly<{ model: MetadataModel; actions: MetadataActions }>;

const metadataLabelKeys = {
  name: 'inspectorNodeNameLabel',
  tags: 'inspectorNodeTagsLabel',
  description: 'inspectorNodeDescriptionLabel',
} as const;

function MetadataFieldView({
  field,
  model,
  actions,
}: MetadataProps & Readonly<{ field: MetadataField }>) {
  const id = `inspector-node-${field}-${model.nodeId}`;
  const errorId = `inspector-node-${field}-error-${model.nodeId}`;
  const error = model.errors[field];
  const Control = field === 'description' ? Textarea : Input;
  return (
    <div className={inspectorVisualClasses.inspectorField}>
      <Label htmlFor={id}>{canvasViewCopy[metadataLabelKeys[field]]}</Label>
      <Control
        id={id}
        name={`node-${field}`}
        value={field === 'tags' ? model.tagsText : model.draft[field]}
        disabled={model.disabled}
        placeholder={field === 'tags' ? canvasViewCopy.inspectorNodeTagsPlaceholder : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          const value = event.target.value;
          if (field === 'tags') actions.onTagsTextChange(value);
          else actions.onDraftChange((draft) => ({ ...draft, [field]: value }));
        }}
        onBlur={actions.onBlur}
      />
      {error ? (
        <p id={errorId} className={inspectorVisualClasses.inspectorErrorText} role="alert">
          {formatCanvasInspectorNodeDraftError(error, canvasViewCopy)}
        </p>
      ) : null}
    </div>
  );
}

export function CanvasInspectorMetadataFields({
  model,
  actions,
  children,
}: MetadataProps & Readonly<{ children: ReactNode }>) {
  if (!model.visible) return children;
  return (
    <>
      <MetadataFieldView field="name" model={model} actions={actions} />
      <MetadataFieldView field="tags" model={model} actions={actions} />
      {children}
      <MetadataFieldView field="description" model={model} actions={actions} />
      {model.disabled ? (
        <p className={inspectorVisualClasses.inspectorBody}>
          {canvasViewCopy.inspectorNodeReadOnlyMessage}
        </p>
      ) : null}
    </>
  );
}
