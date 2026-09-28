/** Apply one explicit JOIN-normalization proposal as a single relation-analysis transaction. */
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';

import {
  isDvtSubstraitJoinConditionGroup,
  isDvtSubstraitJoinNullCondition,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
import type { DvtSubstraitJoinPredicateOperand } from './canvasDvtSubstraitJoinOperand';
import {
  projectJoinNormalization,
  type JoinNormalizationOccurrence,
  type JoinNormalizationProposal,
  type JoinNormalizationTransformation,
} from './canvasJoinNormalizationProposal';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';

export type JoinNormalizationAliasMap = Readonly<Record<string, string>>;

function reject(message: string, relationId: string): never {
  throw new SubstraitAnalysisError('invalid_binding', message, relationId);
}

function occurrenceKey(occurrence: JoinNormalizationOccurrence): string {
  return `${occurrence.conditionPath.join('.') || 'root'}:${occurrence.side}`;
}

function rewriteConditions(
  conditions: readonly DvtSubstraitJoinPredicateCondition[],
  replacements: ReadonlyMap<string, string>
): readonly DvtSubstraitJoinPredicateCondition[] {
  const visit = (
    condition: DvtSubstraitJoinPredicateCondition,
    path: readonly number[]
  ): DvtSubstraitJoinPredicateCondition => {
    if (isDvtSubstraitJoinConditionGroup(condition)) {
      return {
        ...condition,
        conditions: condition.conditions.map((child, index) => visit(child, [...path, index])),
      };
    }
    const field = (side: 'left' | 'right', current: DvtSubstraitJoinPredicateOperand) => {
      const fieldId = replacements.get(occurrenceKey({ conditionPath: path, side }));
      return fieldId == null ? current : ({ kind: 'field', sourceFieldId: fieldId } as const);
    };
    const left = field('left', condition.left);
    return isDvtSubstraitJoinNullCondition(condition)
      ? { ...condition, left }
      : { ...condition, left, right: field('right', condition.right) };
  };
  return conditions.map((condition, index) => visit(condition, [index]));
}

function aliasesFor(
  proposal: JoinNormalizationProposal,
  aliases: JoinNormalizationAliasMap
): ReadonlyMap<string, string> {
  return new Map(
    proposal.transformations.map((transformation) => {
      const alias = aliases[transformation.transformationKey] ?? transformation.suggestedAlias;
      if (alias == null || alias.trim() === '') {
        reject('JOIN normalization requires an explicit derived-output alias.', proposal.relationId);
      }
      return [transformation.transformationKey, alias.trim()] as const;
    })
  );
}

function inputIndexFor(
  proposal: JoinNormalizationProposal,
  transformation: JoinNormalizationTransformation,
  inputRelationIds: readonly string[]
): number {
  const index = inputRelationIds.indexOf(transformation.inputRelationId);
  return index < 0
    ? reject('JOIN normalization input occurrence is unavailable.', proposal.relationId)
    : index;
}

export async function applyJoinNormalization(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    proposal: JoinNormalizationProposal;
    aliases?: JoinNormalizationAliasMap;
    signal?: AbortSignal;
  }>
) {
  const aliases = aliasesFor(request.proposal, request.aliases ?? {});
  return session.transact(
    request.proposal.revision,
    async (staged) => {
      const selected = await querySelectedJoin(
        staged,
        request.proposal.relationId,
        staged.revision,
        request.signal
      );
      const current = projectJoinNormalization(selected);
      if (current.outcome !== 'available') {
        reject('JOIN normalization proposal is no longer available.', request.proposal.relationId);
      }
      const expectedKeys = request.proposal.transformations.map((item) => item.transformationKey);
      const currentKeys = current.proposal.transformations.map((item) => item.transformationKey);
      if (
        expectedKeys.length !== currentKeys.length ||
        expectedKeys.some((key, index) => key !== currentKeys[index])
      ) {
        reject('JOIN normalization proposal no longer matches the selected JOIN.', request.proposal.relationId);
      }

      const originalInputIds = selected.inputs.map((input) => input.relationId);
      const created = new Map<string, string>();

      for (const transformation of request.proposal.transformations) {
        request.signal?.throwIfAborted();
        const inputIndex = inputIndexFor(request.proposal, transformation, originalInputIds);
        const before = await querySelectedJoin(
          staged,
          request.proposal.relationId,
          staged.revision,
          request.signal
        );
        const input = before.inputs[inputIndex];
        if (input == null) reject('JOIN normalization input is unavailable.', request.proposal.relationId);
        const rootBindings = input.bindings.filter((field) => field.parentFieldId == null);
        const operand =
          input.relationId === transformation.inputRelationId
            ? transformation.baseFieldId
            : rootBindings.find(
                (field) =>
                  field.fieldId === transformation.baseFieldId ||
                  field.sourceFieldId === transformation.baseFieldId
              )?.fieldId;
        if (operand == null) {
          reject('JOIN normalization base field is unavailable.', request.proposal.relationId);
        }

        await applySelectedRelationDerivedOutput(staged, {
          relationId: input.relationId,
          expectedRevision: staged.revision,
          intent: input.relationId === transformation.inputRelationId ? 'insert' : 'edit',
          alias: aliases.get(transformation.transformationKey)!,
          capabilityIds: transformation.capabilityIds,
          operandFieldIds: [operand],
          signal: request.signal,
        });

        const after = await querySelectedJoin(
          staged,
          request.proposal.relationId,
          staged.revision,
          request.signal
        );
        const output = after.inputs[inputIndex]?.bindings.find(
          (field) =>
            field.parentFieldId == null &&
            field.displayName === aliases.get(transformation.transformationKey)
        );
        if (output == null) {
          reject('JOIN normalization derived output is unavailable.', request.proposal.relationId);
        }
        created.set(transformation.transformationKey, output.fieldId);
      }

      const rewrittenJoin = await querySelectedJoin(
        staged,
        request.proposal.relationId,
        staged.revision,
        request.signal
      );
      if (rewrittenJoin.conditions == null) {
        reject('JOIN normalization predicate is unavailable.', request.proposal.relationId);
      }
      const replacements = new Map<string, string>();
      for (const transformation of request.proposal.transformations) {
        const fieldId = created.get(transformation.transformationKey);
        if (fieldId == null) {
          reject('JOIN normalization derived field is unavailable.', request.proposal.relationId);
        }
        for (const occurrence of transformation.occurrences) {
          replacements.set(occurrenceKey(occurrence), fieldId);
        }
      }
      await replaceSelectedJoinConditions(staged, {
        relationId: request.proposal.relationId,
        expectedRevision: staged.revision,
        conditions: rewriteConditions(rewrittenJoin.conditions, replacements),
        signal: request.signal,
      });
    },
    request.signal
  );
}
