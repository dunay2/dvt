/** Owned concern: render one localized object-file authoring validation error. */
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { formatCanvasInspectorNodeDraftError } from '../../views/canvas/canvasCopyFormatting';
import { canvasViewCopy } from '../../views/canvas/copy';
import type { ObjectFilePostgresAuthoringErrors } from '../../views/canvas/objectFilePostgresAuthoringModel';

export function ObjectFilePostgresFieldError({
  code,
}: Readonly<{
  code: ObjectFilePostgresAuthoringErrors[keyof ObjectFilePostgresAuthoringErrors];
}>): JSX.Element | null {
  return code == null ? null : (
    <p className={inspectorVisualClasses.inspectorErrorText}>
      {formatCanvasInspectorNodeDraftError(code, canvasViewCopy)}
    </p>
  );
}
