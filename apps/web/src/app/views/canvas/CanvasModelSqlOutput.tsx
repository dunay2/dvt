/**
 * Owned concern: display saved Model SQL only in its visible, passive Output tab.
 * Reason: Model Output consumes the existing protected projection, never a local SQL generator.
 * Corner invariant: local field editing and hidden retained workspaces cannot publish saved SQL.
 */
import { useEffect } from 'react';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { monacoVisualClasses } from '../../components/monaco/monacoVisualTokens';
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
  useEffect(request, [request]);
  const failed = isCurrent && state.status === 'error';
  return (
    <section
      data-slot="canvas-model-sql-output"
      className={inspectorVisualClasses.inspectorDbtSection}
    >
      <h4 className={inspectorVisualClasses.contextPanelSectionTitle}>
        {copy.inspectorTransformOutputPostgresSqlLabel}
      </h4>
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
              : inspectorVisualClasses.inspectorMuted
          }
        >
          {failed
            ? copy.inspectorTransformOutputErrorMessage
            : copy.inspectorTransformOutputLoadingMessage}
        </p>
      )}
    </section>
  );
}
