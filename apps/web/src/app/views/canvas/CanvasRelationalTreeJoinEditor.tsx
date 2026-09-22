/** Owned concern: present JOIN predicates and one explicit next-input binding. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { useMemo } from 'react';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import {
  inspectDvtSubstraitJoinPredicateContext,
  setDvtSubstraitJoinType,
  type DvtSubstraitJoinType,
  type DvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { DvtSubstraitJoinPredicateEditors } from './DvtSubstraitJoinPredicateEditors';
import type { CanonicalNode } from '../../types/canonical';
import { SourceOccurrenceAppendForm } from './relational-source-occurrence/SourceOccurrenceAppendForm';

const selectClassName =
  'h-8 w-full rounded border border-(--border-subtle) bg-(--surface-subtle) px-2 text-xs text-(--text-primary)';

export function CanvasRelationalTreeJoinEditor({
  appendInput,
  copy,
  draft,
  onAppend,
  onChange,
  onPendingConditionChange,
  selectedRelationId,
  transformNode,
}: Readonly<{
  appendInput: CanvasDvtCompositionInput | null;
  copy: CanvasRelationalTreeWorkbenchCopy;
  draft: DvtSubstraitJoinDraft;
  onAppend: (selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>) => void;
  onChange: (draft: DvtSubstraitJoinDraft) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId: string | null;
  transformNode: CanonicalNode;
}>): JSX.Element | null {
  const inspection = useMemo(
    () => inspectDvtSubstraitJoinPredicateContext(draft)?.inspection,
    [draft]
  );
  if (!inspection?.ok) return null;
  const selectedStage = inspection.projection.joinRelations.find(
    ({ relationId }) => relationId === selectedRelationId
  );
  const canChangeJoinType = (joinType: DvtSubstraitJoinType): boolean =>
    selectedStage == null ||
    selectedStage.joinType === joinType ||
    setDvtSubstraitJoinType({
      draft,
      joinRelationId: selectedStage.relationId,
      joinType,
    }) !== draft;
  const hasUnavailableJoinTypes =
    selectedStage != null &&
    (
      [
        JoinRel_JoinType.INNER,
        JoinRel_JoinType.LEFT,
        JoinRel_JoinType.RIGHT,
        JoinRel_JoinType.OUTER,
        JoinRel_JoinType.LEFT_SEMI,
        JoinRel_JoinType.LEFT_ANTI,
        JoinRel_JoinType.RIGHT_SEMI,
        JoinRel_JoinType.RIGHT_ANTI,
      ] as readonly DvtSubstraitJoinType[]
    ).some((joinType) => !canChangeJoinType(joinType));

  return (
    <div className="min-h-0 space-y-3">
      <div className="min-h-0" hidden={appendInput != null}>
        {selectedStage == null ? null : (
          <div className="mb-3 flex flex-wrap items-end gap-2 border-b border-(--border-subtle) pb-2">
            <label className="block min-w-48 space-y-1 text-[11px] text-(--text-muted)">
              <span>{copy.inspectorDvtSubstraitJoinTypeLabel}</span>
              <select
                data-slot="canvas-relational-tree-join-type"
                className={selectClassName}
                value={selectedStage.joinType}
                aria-describedby={
                  hasUnavailableJoinTypes ? 'canvas-relational-tree-join-type-impact' : undefined
                }
                onChange={(event) => {
                  const next = Number(event.currentTarget.value) as DvtSubstraitJoinType;
                  onChange(
                    setDvtSubstraitJoinType({
                      draft,
                      joinRelationId: selectedStage.relationId,
                      joinType: next,
                    })
                  );
                }}
              >
                <option
                  value={JoinRel_JoinType.INNER}
                  disabled={!canChangeJoinType(JoinRel_JoinType.INNER)}
                >
                  {copy.inspectorDvtSubstraitInnerJoinAction}
                </option>
                <option
                  value={JoinRel_JoinType.LEFT}
                  disabled={!canChangeJoinType(JoinRel_JoinType.LEFT)}
                >
                  {copy.inspectorDvtSubstraitLeftJoinAction}
                </option>
                <option
                  value={JoinRel_JoinType.RIGHT}
                  disabled={!canChangeJoinType(JoinRel_JoinType.RIGHT)}
                >
                  {copy.inspectorDvtSubstraitRightJoinAction}
                </option>
                <option
                  value={JoinRel_JoinType.OUTER}
                  disabled={!canChangeJoinType(JoinRel_JoinType.OUTER)}
                >
                  {copy.inspectorDvtSubstraitFullOuterJoinAction}
                </option>
                <option
                  value={JoinRel_JoinType.LEFT_SEMI}
                  disabled={!canChangeJoinType(JoinRel_JoinType.LEFT_SEMI)}
                >
                  {copy.inspectorDvtSubstraitLeftSemiJoinAction}
                </option>
                <option
                  value={JoinRel_JoinType.LEFT_ANTI}
                  disabled={!canChangeJoinType(JoinRel_JoinType.LEFT_ANTI)}
                >
                  {copy.inspectorDvtSubstraitLeftAntiJoinAction}
                </option>
                <option
                  value={JoinRel_JoinType.RIGHT_SEMI}
                  disabled={!canChangeJoinType(JoinRel_JoinType.RIGHT_SEMI)}
                >
                  {copy.inspectorDvtSubstraitRightSemiJoinAction}
                </option>
                <option
                  value={JoinRel_JoinType.RIGHT_ANTI}
                  disabled={!canChangeJoinType(JoinRel_JoinType.RIGHT_ANTI)}
                >
                  {copy.inspectorDvtSubstraitRightAntiJoinAction}
                </option>
              </select>
              {hasUnavailableJoinTypes ? (
                <span
                  id="canvas-relational-tree-join-type-impact"
                  data-slot="canvas-relational-tree-join-type-impact"
                  className="block text-[10px] leading-4 text-(--text-muted)"
                >
                  {copy.inspectorDvtSubstraitJoinTypeImpactHint}
                </span>
              ) : null}
            </label>
            {selectedStage.joinType === JoinRel_JoinType.INNER ? null : (
              <p
                data-slot="canvas-relational-tree-join-roles"
                className="pb-1 text-[11px] text-(--text-secondary)"
              >
                {selectedStage.joinType === JoinRel_JoinType.LEFT
                  ? copy.inspectorDvtSubstraitLeftJoinRolesHint
                  : selectedStage.joinType === JoinRel_JoinType.RIGHT
                    ? copy.inspectorDvtSubstraitRightJoinRolesHint
                    : selectedStage.joinType === JoinRel_JoinType.OUTER
                      ? copy.inspectorDvtSubstraitFullOuterJoinRolesHint
                      : selectedStage.joinType === JoinRel_JoinType.LEFT_SEMI ||
                          selectedStage.joinType === JoinRel_JoinType.LEFT_ANTI
                        ? copy.inspectorDvtSubstraitLeftFilteringJoinRolesHint
                        : copy.inspectorDvtSubstraitRightFilteringJoinRolesHint}
              </p>
            )}
          </div>
        )}
        <DvtSubstraitJoinPredicateEditors
          disabled={false}
          draft={draft}
          projection={inspection.projection}
          onChange={onChange}
          onPendingConditionChange={onPendingConditionChange}
          selectedRelationId={selectedRelationId}
          transformNode={transformNode}
        />
      </div>
      {appendInput == null ? null : (
        <SourceOccurrenceAppendForm
          appendInput={appendInput}
          projection={inspection.projection}
          draft={draft}
          copy={copy}
          onAppend={onAppend}
        />
      )}
    </div>
  );
}
