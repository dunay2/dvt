/**
 * Owned concern: explicitly request saved SQL in the visible, passive Model SQL view.
 * Reason: Model Output consumes the existing protected projection, never a local SQL generator.
 * Corner invariant: local field editing and hidden retained workspaces cannot publish saved SQL.
 */
import { Code2, LoaderCircle } from 'lucide-react';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { monacoVisualClasses } from '../../components/monaco/monacoVisualTokens';
import { Button } from '../../components/ui/button';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { DvtSubstraitTransformOutputProjectionArgs } from './canvasDvtSubstraitOutputProjection';
import { useCanvasOutputPresentation } from './CanvasRelationalTreeEditorFrame';
import { useCanvasTransformSqlOutput } from './useCanvasTransformSqlOutput';

export function CanvasModelSqlOutput(
  props: DvtSubstraitTransformOutputProjectionArgs
): JSX.Element | null {
  const { active, editing } = useCanvasOutputPresentation();
  return active && !editing ? <CanvasModelSqlOutputQuery {...props} /> : null;
}

function CanvasModelSqlOutputQuery(props: DvtSubstraitTransformOutputProjectionArgs): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(language);
  const { state, isCurrent, request } = useCanvasTransformSqlOutput(props);
  const failed = isCurrent && state.status === 'error';
  const pending = isCurrent && state.status === 'loading';
  const available = props.codeProjection != null;
  return (
    <section
      data-slot="canvas-model-sql-output"
      className={inspectorVisualClasses.inspectorField}
      aria-busy={pending}
    >
      <div className={inspectorVisualClasses.inspectorActions}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-slot="canvas-model-sql-generate"
          disabled={pending || !available}
          onClick={request}
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
          ) : (
            <Code2
              aria-hidden="true"
              className={inspectorVisualClasses.inspectorFieldInclusionIcon}
            />
          )}
          {copy.inspectorModelSqlGenerateAction}
        </Button>
      </div>
      {isCurrent && state.status === 'ready' ? (
        <MonacoCodeViewer
          ariaLabel={copy.inspectorTransformOutputPostgresSqlLabel}
          language="sql"
          loadingLabel={copy.inspectorTransformOutputLoadingMessage}
          containerClassName={monacoVisualClasses.surface}
          value={state.sql}
        />
      ) : (
        <p
          role={failed ? 'alert' : 'status'}
          className={
            failed
              ? inspectorVisualClasses.inspectorErrorText
              : inspectorVisualClasses.contextPanelSectionDescription
          }
        >
          {!available
            ? copy.inspectorModelSqlUnavailableMessage
            : failed
              ? copy.inspectorTransformOutputErrorMessage
              : pending
                ? copy.inspectorTransformOutputLoadingMessage
                : copy.inspectorModelSqlIdleMessage}
        </p>
      )}
    </section>
  );
}
