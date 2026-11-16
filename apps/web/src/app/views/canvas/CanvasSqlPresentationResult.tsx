/** Present original/derived SQL and the server's actual trace without generating or rewriting SQL. */
import type { TransformSqlProjectionResponse } from '@dvt/contracts';
import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  inspectorVisualClasses,
  inspectorPropertyClasses,
} from '../../components/inspector/inspectorVisualTokens';
import { cn } from '../../components/ui/utils';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

export function CanvasSqlPresentationResult({
  result,
  children,
}: Readonly<{
  result: Pick<TransformSqlProjectionResponse, 'sql' | 'presentation'>;
  children: (sql: string) => ReactNode;
}>): JSX.Element {
  const [original, setOriginal] = useState(false);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(language);
  const ruleLabels = {
    'SQLREAD1.PROJECTION_FUSION': copy.inspectorSqlProjectionFusionLabel,
    'SQLREAD1.PREDICATE_PUSHDOWN': copy.inspectorSqlPredicatePushdownLabel,
    'SQLREAD1.COLUMN_PRUNING': copy.inspectorSqlColumnPruningLabel,
    'SQLREAD1.TRANSPARENT_SUBQUERY': copy.inspectorSqlTransparentSubqueryLabel,
  };
  const diagnosticLabels: Readonly<Record<string, string>> = {
    metadata_permission_denied: copy.inspectorSqlMetadataDeniedMessage,
    metadata_unavailable: copy.inspectorSqlMetadataUnavailableMessage,
    relation_resolution_unavailable: copy.inspectorSqlRelationUnavailableMessage,
    native_validation_failed: copy.inspectorSqlNativeValidationMessage,
    missing_resolution: copy.inspectorSqlMissingResolutionMessage,
    unsupported_shape: copy.inspectorSqlUnsupportedShapeMessage,
    unknown_reference: copy.inspectorSqlUnknownReferenceMessage,
    ambiguous_reference: copy.inspectorSqlAmbiguousReferenceMessage,
    invalid_resolution: copy.inspectorSqlInvalidResolutionMessage,
    resolution_limit: copy.inspectorSqlResolutionLimitMessage,
  };
  const presentation = result.presentation;
  const rewritten = presentation?.status === 'rewritten';
  const diagnostic = presentation?.status === 'retained' ? presentation.diagnostic : undefined;
  const message = rewritten
    ? copy.inspectorSqlRewrittenMessage.replace('{count}', String(presentation.steps.length))
    : presentation?.status === 'unchanged'
      ? copy.inspectorSqlUnchangedMessage
      : presentation === undefined
        ? copy.inspectorSqlOriginalLabel
        : copy.inspectorSqlRetainedMessage;
  return (
    <div
      data-slot="canvas-sql-presentation-result"
      className={cn(
        inspectorVisualClasses.inspectorField,
        inspectorPropertyClasses.contributionFill
      )}
    >
      {rewritten ? (
        <label className={inspectorVisualClasses.inspectorLabel}>
          <span>{copy.inspectorTransformOutputViewLabel}</span>
          <select
            data-slot="canvas-sql-presentation-selector"
            className={inspectorVisualClasses.inspectorSelectInput}
            value={original ? 'original' : 'readable'}
            onChange={(event) => setOriginal(event.currentTarget.value === 'original')}
          >
            <option value="readable">{copy.inspectorSqlReadableLabel}</option>
            <option value="original">{copy.inspectorSqlOriginalLabel}</option>
          </select>
        </label>
      ) : null}
      <p role="status" className={inspectorVisualClasses.contextPanelSectionDescription}>
        {message}
      </p>
      {rewritten || diagnostic !== undefined ? (
        <details className={inspectorPropertyClasses.records.disclosure}>
          <summary className={inspectorPropertyClasses.records.trigger}>
            <ChevronRight aria-hidden="true" className={inspectorPropertyClasses.records.arrow} />
            {copy.inspectorSqlTraceLabel}
          </summary>
          {rewritten ? (
            <ol
              className={cn(
                inspectorVisualClasses.contextPanelSectionDescription,
                inspectorPropertyClasses.records.region
              )}
            >
              {presentation.steps.map((step, index) => (
                <li key={index}>
                  {index + 1}. {ruleLabels[step.rule]} <code>{step.path}</code>
                </li>
              ))}
            </ol>
          ) : diagnostic === undefined ? null : (
            <p className={inspectorVisualClasses.contextPanelSectionDescription}>
              {diagnosticLabels[diagnostic.code] ?? copy.inspectorSqlRetainedMessage}{' '}
              <code>
                {diagnostic.code} · {diagnostic.path}
              </code>
            </p>
          )}
        </details>
      ) : null}
      {children(rewritten && !original ? presentation.sql : result.sql)}
    </div>
  );
}
