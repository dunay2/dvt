/** Bind a connected Read alias form to the existing revision-bound rename command. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { ReactNode } from 'react';
import { renameSourceOccurrence } from './renameSourceOccurrence';
import { useRelationCommand } from '../useRelationCommand';
import { CanvasRelationFields } from '../CanvasRelationFields';
import { sourceOccurrenceAliases } from './sourceOccurrenceAlias';
import { SourceOccurrencePropertiesForm } from './SourceOccurrencePropertiesForm';
import { CanvasSourceOccurrenceOutputSelection } from '../CanvasSourceOccurrenceOutputSelection';
import type { CanvasSourceInputRecovery } from '../canvasSourceOccurrenceInputRecovery';

export function SourceOccurrenceProperties({
  draft,
  relationId,
  reservedAliases = [],
  onChange,
  onClose,
  onPendingChange,
  output,
  publishedFieldNames,
  sourceInputRecovery,
}: Readonly<{
  draft: SubstraitDocument;
  relationId: string;
  reservedAliases?: readonly string[];
  onChange: (draft: SubstraitDocument) => void;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
  output?: ReactNode;
  publishedFieldNames?: readonly string[];
  sourceInputRecovery?: CanvasSourceInputRecovery;
}>): JSX.Element {
  const binding = draft.sidecar.relations.find((read) => read.relationId === relationId);
  const occupied = new Set([
    ...sourceOccurrenceAliases(draft.sidecar.relations, relationId),
    ...reservedAliases,
  ]);
  const command = useRelationCommand(relationId, onChange);
  return (
    <SourceOccurrencePropertiesForm
      data={{
        relationId,
        alias: binding?.displayName ?? '',
        occupied,
        supported: binding?.sourceRef != null || binding?.producerRef != null,
      }}
      actions={{
        close: onClose,
        save: (alias) =>
          !occupied.has(alias) &&
          command.execute((session, target) =>
            renameSourceOccurrence(session, { ...target, alias })
          ),
      }}
      onPendingChange={onPendingChange}
      output={
        output ??
        (publishedFieldNames == null ? (
          <CanvasRelationFields relationId={relationId} />
        ) : (
          <CanvasSourceOccurrenceOutputSelection
            relationId={relationId}
            publishedFieldNames={publishedFieldNames}
            onChange={onChange}
            recovery={
              sourceInputRecovery == null
                ? undefined
                : {
                    fieldIds: sourceInputRecovery.fieldsByRelationId.get(relationId) ?? new Set(),
                    busy: sourceInputRecovery.busy,
                    restore: (fieldId) => sourceInputRecovery.restore(relationId, fieldId),
                  }
            }
          />
        ))
      }
    />
  );
}
