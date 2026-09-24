/** Owned concern: edit a selected Read label inside the existing properties transaction. */
import { useEffect, useId, useState } from 'react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { DvtSubstraitJoinDraft } from '../canvasDvtSubstraitJoinComposition';
import { CanvasRelationalTreeEditorFrame } from '../CanvasRelationalTreeEditorFrame';
import { renameSourceOccurrence } from './sourceOccurrencePolicy';
import { sourceOccurrenceCopy } from './sourceOccurrenceCopy';
import { CanvasRelationFields } from '../CanvasRelationFields';

export function SourceOccurrenceProperties({
  draft,
  relationId,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  draft: DvtSubstraitJoinDraft;
  relationId: string;
  onChange: (draft: DvtSubstraitJoinDraft) => void;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = sourceOccurrenceCopy(language);
  const id = useId();
  const binding = draft.sidecar.relations.find((read) => read.relationId === relationId);
  const currentAlias = binding?.displayName ?? '';
  const [alias, setAlias] = useState(currentAlias);
  const result = renameSourceOccurrence(draft, relationId, alias);
  const supported = renameSourceOccurrence(draft, relationId, currentAlias || 'Read').ok;
  const pending = supported && alias !== currentAlias;
  useEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);
  return (
    <CanvasRelationalTreeEditorFrame
      operation="read"
      relationId={relationId}
      label={currentAlias}
      hasExpression={false}
      onClose={onClose}
    >
      {supported ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!result.ok) return;
            onChange(result.draft);
            setAlias(alias.trim());
          }}
        >
          <label htmlFor={id} className="block text-xs text-(--text-muted)">
            {copy.alias}
          </label>
          <Input
            id={id}
            data-slot="source-occurrence-alias"
            value={alias}
            aria-invalid={!result.ok}
            aria-describedby={!result.ok ? `${id}-error` : undefined}
            onChange={(event) => setAlias(event.currentTarget.value)}
          />
          {result.ok ? null : (
            <p id={`${id}-error`} role="alert" className="text-xs text-amber-300">
              {copy[result.reason]}
            </p>
          )}
          <Button
            type="submit"
            size="sm"
            data-slot="source-occurrence-update"
            disabled={!pending || !result.ok}
          >
            {copy.update}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-(--text-muted)">{copy.aliasUnsupported}</p>
      )}
      <CanvasRelationFields relationId={relationId} />
    </CanvasRelationalTreeEditorFrame>
  );
}
