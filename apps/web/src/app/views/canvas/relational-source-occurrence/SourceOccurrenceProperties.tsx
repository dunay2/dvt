/** Bind a connected Read alias form to the existing revision-bound rename command. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { renameSourceOccurrence } from './renameSourceOccurrence';
import { useRelationCommand } from '../useRelationCommand';
import { CanvasRelationFields } from '../CanvasRelationFields';
import { sourceOccurrenceAliases } from './sourceOccurrenceAlias';
import { SourceOccurrencePropertiesForm } from './SourceOccurrencePropertiesForm';

export function SourceOccurrenceProperties({
  draft,
  relationId,
  reservedAliases = [],
  onChange,
  onClose,
  onPendingChange,
}: Readonly<{
  draft: SubstraitDocument;
  relationId: string;
  reservedAliases?: readonly string[];
  onChange: (draft: SubstraitDocument) => void;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
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
        supported: binding?.sourceRef != null,
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
      output={<CanvasRelationFields relationId={relationId} />}
    />
  );
}
