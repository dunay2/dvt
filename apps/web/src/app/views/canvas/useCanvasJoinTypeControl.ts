/** Share canonical output-impact choices and the revision-bound command across JOIN controls. */
import type { DvtSubstraitJoinType } from '@dvt/postgres-projection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { SelectedJoin } from './canvasSelectedJoin';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  changeSelectedJoinType,
  editableJoinTypes,
  selectedJoinTypeMapping,
} from './canvasSelectedJoinType';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';
import { useRelationCommand } from './useRelationCommand';

export function useCanvasJoinTypeControl(
  selected: SelectedJoin,
  copy: CanvasRelationalTreeWorkbenchCopy,
  onChange: (document: SubstraitDocument) => boolean | void
) {
  const command = useRelationCommand(selected.relationId, onChange);
  const message = selected.target.relation.relType;
  const widths = selected.inputs.map((input) => input.fields.length);
  const choices =
    message.case !== 'join'
      ? []
      : editableJoinTypes.map((type) => ({
          type,
          disabled: selectedJoinTypeMapping(message.value, widths, type) == null,
          label:
            copy[
              resolveCanvasRelationalOperationPresentation(canvasJoinOperationForType(type))
                .labelKey
            ],
        }));
  return {
    choices,
    state: command.state,
    select: (joinType: DvtSubstraitJoinType) =>
      command.execute((session, request) =>
        changeSelectedJoinType(session, { ...request, joinType })
      ),
  };
}
