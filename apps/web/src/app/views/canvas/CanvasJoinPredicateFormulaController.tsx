/**
 * Owned concern: coordinate a local JOIN formula draft with the shared editor and existing command.
 * @baseline GH-3612: the full predicate, not a derived output, owns this expression.
 * @decision Reuse provider admission, field suggestions and revision-bound command execution.
 * @consequence Canonical expressions persist; cancel and rejected writes preserve the original JOIN.
 * @version 1.0.0
 */
import { useContext, useMemo, useState, type ReactNode } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { DerivedOutputFormulaEditor } from './DerivedOutputFormulaEditor';
import { formulaSuggestions } from './canvasFormulaAssist';
import {
  compileJoinPredicateFormula,
  joinPredicateFormulaScope,
  JoinPredicateFormulaError,
} from './canvasJoinPredicateFormula';
import { CanvasJoinPredicateFormulaTemplate } from './CanvasJoinPredicateFormulaTemplate';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import type { SelectedJoin } from './canvasSelectedJoin';
import { useRelationCommand } from './useRelationCommand';
import { SubstraitAnalysisError, type SubstraitDocument } from '@dvt/substrait-analysis';

export type JoinPredicateFormulaDraft = Readonly<{
  relationId: string;
  revision: number;
  formula: string;
}>;

export function CanvasJoinPredicateFormula({
  selected,
  draft,
  onDraftChange,
  onChange,
  disabled,
  children,
}: Readonly<{
  selected: SelectedJoin;
  draft: JoinPredicateFormulaDraft | null;
  onDraftChange: (draft: JoinPredicateFormulaDraft | null) => void;
  onChange: (document: SubstraitDocument) => void;
  disabled: boolean;
  children: ReactNode;
}>) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const command = useRelationCommand(selected.relationId, onChange);
  const [error, setError] = useState<string | null>(null);
  const scope = useMemo(() => joinPredicateFormulaScope(selected), [selected]);
  const provider = useMemo(() => {
    try {
      return analysis?.session.executionProvider(selected.revision);
    } catch {
      return undefined;
    }
  }, [analysis, selected.revision]);
  const suggestions = useMemo(
    () => (provider == null ? [] : formulaSuggestions(scope.fields, provider)),
    [scope, provider]
  );
  const stale = draft != null && draft.revision !== selected.revision;
  const diagnostic = useMemo(() => {
    if (draft == null || draft.formula.trim() === '' || provider == null) return null;
    try {
      compileJoinPredicateFormula(selected, draft.formula, provider);
      return null;
    } catch (cause) {
      return cause instanceof JoinPredicateFormulaError
        ? copy.joinFormula[cause.reason]
        : copy.joinFormula.invalid;
    }
  }, [draft, selected, provider, copy]);
  const busy = command.state === 'busy';
  const saveDisabled =
    disabled ||
    busy ||
    stale ||
    provider == null ||
    draft == null ||
    draft.formula.trim() === '' ||
    diagnostic != null;
  const submit = async () => {
    if (saveDisabled || draft == null) return;
    const result = await command.execute((session, request) => {
      if (request.expectedRevision !== draft.revision)
        throw new SubstraitAnalysisError('stale_document', 'Stale JOIN formula draft.');
      return replaceSelectedJoinConditions(session, { ...request, formula: draft.formula });
    });
    if (result) onDraftChange(null);
    else setError(copy.joinFormula.failed);
  };
  return (
    <CanvasJoinPredicateFormulaTemplate
      copy={copy.joinFormula}
      editing={draft != null}
      busy={busy}
      editDisabled={disabled || provider == null}
      saveDisabled={saveDisabled}
      error={stale ? copy.derivedOutput.stale : (error ?? diagnostic)}
      onEdit={() => {
        setError(null);
        onDraftChange({
          relationId: selected.relationId,
          revision: selected.revision,
          formula: scope.formula ?? '',
        });
      }}
      onCancel={() => {
        setError(null);
        onDraftChange(null);
      }}
      onSubmit={() => void submit()}
      editor={
        draft == null ? null : (
          <DerivedOutputFormulaEditor
            formula={draft.formula}
            suggestions={suggestions}
            dragScope={{
              rootId: analysis?.session.rootId ?? '',
              revision: draft.revision,
              references: scope.references,
            }}
            copy={copy.derivedOutput}
            disabled={disabled || busy || stale}
            diagnostic={diagnostic ?? undefined}
            onInvalidDrop={() => setError(copy.joinFormula.invalid)}
            onChange={(formula) => {
              setError(null);
              onDraftChange({ ...draft, formula });
            }}
          />
        )
      }
    >
      {children}
    </CanvasJoinPredicateFormulaTemplate>
  );
}
