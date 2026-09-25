/** Owned concern: edit a selected Read label inside the existing properties transaction. */
import { useEffect, useId, useState } from 'react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationalTreeEditorFrame } from '../CanvasRelationalTreeEditorFrame';
import { parseOccurrenceAlias, renameSourceOccurrence } from './renameSourceOccurrence';
import { useRelationCommand } from '../useRelationCommand';
import { sourceOccurrenceCopy } from './sourceOccurrenceCopy';
import { CanvasRelationFields } from '../CanvasRelationFields';

export function SourceOccurrenceProperties({
  draft,
  relationId,
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  draft: SubstraitDocument;
  relationId: string;
  onChange: (draft: SubstraitDocument) => void;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = sourceOccurrenceCopy(language);
  const id = useId();
  const binding = draft.sidecar.relations.find((read) => read.relationId === relationId);
  const currentAlias = binding?.displayName ?? '';
  const [alias, setAlias] = useState(currentAlias);
  const result = parseOccurrenceAlias(alias);
  const supported = binding?.sourceRef != null;
  const command = useRelationCommand(relationId, onChange);
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
      output={<CanvasRelationFields relationId={relationId} />}
    >
      {supported ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!result.success) return;
            void command
              .execute((session, target) =>
                renameSourceOccurrence(session, { ...target, alias: result.data })
              )
              .then((accepted) => {
                if (accepted) setAlias(result.data);
              });
          }}
        >
          <label htmlFor={id} className="block text-xs text-(--text-muted)">
            {copy.alias}
          </label>
          <Input
            id={id}
            data-slot="source-occurrence-alias"
            value={alias}
            aria-invalid={!result.success}
            aria-describedby={!result.success ? `${id}-error` : undefined}
            onChange={(event) => setAlias(event.currentTarget.value)}
          />
          {result.success && command.state !== 'error' ? null : (
            <p id={`${id}-error`} role="alert" className="text-xs text-amber-300">
              {copy[result.success ? 'unsupported' : 'invalid_alias']}
            </p>
          )}
          <Button
            type="submit"
            size="sm"
            data-slot="source-occurrence-update"
            disabled={!pending || !result.success || command.state === 'busy'}
          >
            {copy.update}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-(--text-muted)">{copy.aliasUnsupported}</p>
      )}
    </CanvasRelationalTreeEditorFrame>
  );
}
