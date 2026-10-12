/** JOIN type presentation uses output-impact facts, never speculative command execution. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { DvtSubstraitJoinType } from '@dvt/postgres-projection';
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

export function CanvasJoinTypeProperties({
  selected,
  copy,
  onChange,
  disabled = false,
}: Readonly<{
  selected: SelectedJoin;
  copy: CanvasRelationalTreeWorkbenchCopy;
  onChange: (document: SubstraitDocument) => void;
  disabled?: boolean;
}>) {
  const command = useRelationCommand(selected.relationId, onChange);
  const message = selected.target.relation.relType;
  if (message.case !== 'join') return null;
  const choices = editableJoinTypes.map((type) => ({
    type,
    disabled:
      selectedJoinTypeMapping(
        message.value,
        selected.inputs.map((input) => input.fields.length),
        type
      ) == null,
    label:
      copy[resolveCanvasRelationalOperationPresentation(canvasJoinOperationForType(type)).labelKey],
  }));
  const unavailable = choices.some((choice) => choice.disabled);
  const roles: Partial<Record<JoinRel_JoinType, string>> = {
    [JoinRel_JoinType.LEFT]: copy.inspectorDvtSubstraitLeftJoinRolesHint,
    [JoinRel_JoinType.RIGHT]: copy.inspectorDvtSubstraitRightJoinRolesHint,
    [JoinRel_JoinType.OUTER]: copy.inspectorDvtSubstraitFullOuterJoinRolesHint,
    [JoinRel_JoinType.LEFT_SEMI]: copy.inspectorDvtSubstraitLeftFilteringJoinRolesHint,
    [JoinRel_JoinType.LEFT_ANTI]: copy.inspectorDvtSubstraitLeftFilteringJoinRolesHint,
    [JoinRel_JoinType.RIGHT_SEMI]: copy.inspectorDvtSubstraitRightFilteringJoinRolesHint,
    [JoinRel_JoinType.RIGHT_ANTI]: copy.inspectorDvtSubstraitRightFilteringJoinRolesHint,
  };
  return (
    <div className="mb-3 space-y-2 border-b border-(--border-subtle) pb-2">
      <label className="block space-y-1 text-[11px] text-(--text-muted)">
        <span>{copy.inspectorDvtSubstraitJoinTypeLabel}</span>
        <select
          data-slot="canvas-relational-tree-join-type"
          value={selected.type}
          disabled={disabled || command.state === 'busy'}
          className="h-8 w-full rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 text-xs"
          onChange={(event) => {
            const joinType = Number(event.currentTarget.value) as DvtSubstraitJoinType;
            void command.execute((session, request) =>
              changeSelectedJoinType(session, { ...request, joinType })
            );
          }}
        >
          {choices.map((choice) => (
            <option key={choice.type} value={choice.type} disabled={choice.disabled}>
              {choice.label}
            </option>
          ))}
        </select>
        {unavailable ? (
          <span data-slot="canvas-relational-tree-join-type-impact">
            {copy.inspectorDvtSubstraitJoinTypeImpactHint}
          </span>
        ) : null}
      </label>
      {roles[selected.type] == null ? null : (
        <p data-slot="canvas-relational-tree-join-roles" className="text-xs">
          {roles[selected.type]}
        </p>
      )}
      {command.state === 'error' ? <p role="alert">No se pudo cambiar el tipo de JOIN.</p> : null}
    </div>
  );
}
