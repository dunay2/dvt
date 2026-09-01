/** Owned concern: render DVT Transform authoring fields. */
import type { ConnectionRef } from '@dvt/contracts';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import {
  MonacoCodeEditor,
  type MonacoCodeDiagnostic,
} from '../../components/monaco/MonacoCodeEditor';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { Button } from '../../components/ui/button';
import type {
  PostgresTransformSqlDiagnostic,
  PostgresTransformSqlValidationResult,
} from '../../ports/workspace';
import { useOptionalWarehouseSourceImportPort } from '../../services/AppServicesContext';
import type { CanonicalNode } from '../../types/canonical';
import type { DvtSqlTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import { formatCanvasInspectorNodeDraftError } from './canvasCopyFormatting';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftErrors,
} from './canvasInspectorAuthoring.types';
import { canvasViewCopy } from './copy';

export function DvtSqlTransformAuthoringSection({
  node,
  disabled,
  draft,
  errors,
  section = 'all',
  inheritedConnectionRef,
  onStartSubstraitPilot,
  substraitInnerJoinSummary,
  onStartSubstraitInnerJoin,
  substraitUnionAllSummary,
  onStartSubstraitUnionAll,
  onChange,
}: Readonly<{
  node: CanonicalNode;
  disabled: boolean;
  draft: DvtSqlTransformAuthoringMetadata;
  errors: CanvasInspectorNodeDraftErrors['dvt'];
  section?: 'all' | 'code';
  inheritedConnectionRef?: ConnectionRef;
  onStartSubstraitPilot?: () => void;
  substraitInnerJoinSummary?: string;
  onStartSubstraitInnerJoin?: () => void;
  substraitUnionAllSummary?: string;
  onStartSubstraitUnionAll?: () => void;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>): JSX.Element {
  const warehouseSourceImport = useOptionalWarehouseSourceImportPort();
  const requestSequence = useRef(0);
  const [validation, setValidation] = useState<
    PostgresTransformSqlValidationResult | 'checking' | null
  >(null);
  useEffect(() => {
    const sequence = ++requestSequence.current;
    if (disabled || warehouseSourceImport == null || inheritedConnectionRef == null) {
      setValidation(null);
      return;
    }

    setValidation('checking');
    const timeout = window.setTimeout(() => {
      void warehouseSourceImport
        .validatePostgresTransformSql({ connectionRef: inheritedConnectionRef, sql: draft.sql })
        .then(
          (result) => {
            if (requestSequence.current === sequence) setValidation(result);
          },
          () => {
            if (requestSequence.current === sequence) {
              setValidation({
                status: 'unavailable',
                diagnostics: [
                  {
                    code: 'connection_unavailable',
                    source: 'connection',
                    message: 'PostgreSQL SQL validation is unavailable.',
                  },
                ],
              });
            }
          }
        );
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      if (requestSequence.current === sequence) requestSequence.current += 1;
    };
  }, [disabled, draft.sql, inheritedConnectionRef, warehouseSourceImport]);

  const showCode = section === 'all' || section === 'code';

  return (
    <div className={inspectorVisualClasses.inspectorDbtSection}>
      {showCode ? (
        <div className="space-y-3">
          <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
            {canvasViewCopy.inspectorDvtSqlTransformTitle}
          </h3>
          {onStartSubstraitPilot == null ? null : (
            <div className="flex items-center justify-between gap-3 rounded border border-[color:var(--border-default)] px-3 py-2">
              <p className="text-xs text-(--text-muted)">customers · name → trim → upper</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                data-slot="dvt-start-substrait-pilot"
                onClick={onStartSubstraitPilot}
              >
                Substrait
              </Button>
            </div>
          )}
          {onStartSubstraitInnerJoin == null || substraitInnerJoinSummary == null ? null : (
            <div className="flex items-center justify-between gap-3 rounded border border-[color:var(--border-default)] px-3 py-2">
              <p className="text-xs text-(--text-muted)">{substraitInnerJoinSummary}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                data-slot="dvt-start-substrait-inner-join"
                onClick={onStartSubstraitInnerJoin}
              >
                {canvasViewCopy.inspectorDvtSubstraitInnerJoinAction}
              </Button>
            </div>
          )}
          {onStartSubstraitUnionAll == null || substraitUnionAllSummary == null ? null : (
            <div className="flex items-center justify-between gap-3 rounded border border-[color:var(--border-default)] px-3 py-2">
              <p className="text-xs text-(--text-muted)">{substraitUnionAllSummary}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                data-slot="dvt-start-substrait-union-all"
                onClick={onStartSubstraitUnionAll}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onStartSubstraitUnionAll();
                  }
                }}
              >
                {canvasViewCopy.inspectorDvtSubstraitUnionAllAction}
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <h4 className={inspectorVisualClasses.contextPanelSectionTitle}>
              {canvasViewCopy.inspectorDvtSqlLabel}
            </h4>
            <MonacoCodeEditor
              ariaLabel={canvasViewCopy.inspectorDvtSqlLabel}
              language="sql"
              loadingLabel={canvasViewCopy.inspectorDvtSqlLabel}
              onChange={(sql) =>
                onChange((currentDraft) =>
                  currentDraft.dvt?.kind === 'transform'
                    ? {
                        ...currentDraft,
                        dvt: { ...currentDraft.dvt, sql },
                      }
                    : currentDraft
                )
              }
              path={`canvas/${node.id}.sql`}
              readOnly={disabled}
              value={draft.sql}
              diagnostics={toMonacoDiagnostics(validation)}
            />
            {errors?.sql ? (
              <p className={inspectorVisualClasses.inspectorErrorText}>
                {formatCanvasInspectorNodeDraftError(errors.sql, canvasViewCopy)}
              </p>
            ) : null}
            {validation == null ? null : (
              <p
                aria-live="polite"
                className={
                  validation === 'checking' || validation.status === 'valid'
                    ? 'text-xs text-(--text-muted)'
                    : inspectorVisualClasses.inspectorErrorText
                }
                data-slot="dvt-sql-validation-status"
              >
                {formatSqlValidation(validation)}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toMonacoDiagnostics(
  validation: PostgresTransformSqlValidationResult | 'checking' | null
): readonly MonacoCodeDiagnostic[] {
  if (validation == null || validation === 'checking' || validation.status === 'valid') return [];
  return validation.diagnostics.map((diagnostic) => ({
    message: formatSqlDiagnostic(diagnostic),
    ...(diagnostic.startOffset === undefined ? {} : { startOffset: diagnostic.startOffset }),
    ...(diagnostic.endOffset === undefined ? {} : { endOffset: diagnostic.endOffset }),
  }));
}

function formatSqlValidation(
  validation: PostgresTransformSqlValidationResult | 'checking'
): string {
  if (validation === 'checking') return canvasViewCopy.inspectorDvtSqlValidationCheckingLabel;
  if (validation.status === 'valid') return canvasViewCopy.inspectorDvtSqlValidationValidLabel;
  return formatSqlDiagnostic(validation.diagnostics[0]);
}

function formatSqlDiagnostic(diagnostic: PostgresTransformSqlDiagnostic | undefined): string {
  switch (diagnostic?.code) {
    case 'sql_required':
      return canvasViewCopy.inspectorDvtSqlRequiredMessage;
    case 'syntax_error':
      return canvasViewCopy.inspectorDvtSqlSyntaxErrorMessage;
    case 'multiple_statements':
      return canvasViewCopy.inspectorDvtSqlMultipleStatementsMessage;
    case 'unsupported_statement':
      return canvasViewCopy.inspectorDvtSqlUnsupportedStatementMessage;
    case 'undefined_table':
      return canvasViewCopy.inspectorDvtSqlUndefinedTableMessage;
    case 'undefined_column':
      return canvasViewCopy.inspectorDvtSqlUndefinedColumnMessage;
    case 'postgres_error':
      return canvasViewCopy.inspectorDvtSqlPostgresErrorMessage;
    default:
      return canvasViewCopy.inspectorDvtSqlValidationUnavailableLabel;
  }
}
