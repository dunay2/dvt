/** Insert and select a Transform using the same revision-bound command as other dataset edits. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';
import { useSelectedRelationInput } from './useSelectedRelationInput';
import { useRelationCommand } from './useRelationCommand';

export function useCanvasTransformStage(
  relationId: string | null,
  onChange: (document: SubstraitDocument) => void | boolean,
  onSelect: (relationId: string) => void,
  editable: boolean
) {
  const input = useSelectedRelationInput(relationId, 'insert');
  const command = useRelationCommand(input?.targetId ?? '', onChange);
  const available =
    editable &&
    input != null &&
    DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
      (entry) =>
        entry.profileStatus === 'supported-profile' &&
        entry.entryId.endsWith('/substrait.ProjectRel')
    );
  return {
    available: available && command.state !== 'busy',
    error: command.state === 'error',
    insert: async () => {
      if (!available) return;
      let createdId: string | null = null;
      const accepted = await command.execute(async (session, identity) => {
        const result = await insertSelectedRelationTransform(session, identity);
        createdId = result.relationId;
        return result.document;
      });
      if (accepted && createdId != null) onSelect(createdId);
    },
  };
}
