/** Owned concern: edit predicates already stored in one canonical JOIN draft. */
import { useCallback, useEffect, useState } from 'react';
import {
  addDvtSubstraitJoinPredicateCondition,
  removeDvtSubstraitJoinPredicateCondition,
  updateDvtSubstraitJoinPredicateCondition,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import { SemanticWorkbenchJoinConditionEditor } from './SemanticWorkbenchJoinConditionEditor';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasRelationalJoinExpressionTree } from './CanvasRelationalJoinExpressionTree';

export function DvtSubstraitJoinPredicateEditors({
  disabled,
  draft,
  projection,
  onChange,
  onPendingConditionChange,
  selectedRelationId,
  transformNode,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitJoinDraft;
  projection: DvtSubstraitNInputJoinProjection;
  onChange: (draft: DvtSubstraitJoinDraft) => void;
  onPendingConditionChange?: (pending: boolean) => void;
  selectedRelationId?: string | null;
  transformNode?: CanonicalNode;
}>): JSX.Element {
  const [editing, setEditing] = useState<ReadonlySet<string>>(() => new Set());
  const trackEditing = useCallback((relationId: string, pending: boolean) => {
    setEditing((current) => {
      if (current.has(relationId) === pending) return current;
      const next = new Set(current);
      if (pending) next.add(relationId);
      else next.delete(relationId);
      return next;
    });
  }, []);
  useEffect(() => {
    onPendingConditionChange?.(editing.size > 0);
  }, [editing.size, onPendingConditionChange]);
  return (
    <div
      className={transformNode == null ? 'space-y-3' : 'min-h-0'}
      data-slot="dvt-substrait-join-predicate-editors"
    >
      {projection.joins.map((join, index) => {
        const joinRelation = projection.joinRelations[index];
        if (joinRelation == null) return null;
        return (
          <fieldset
            key={joinRelation.relationId}
            disabled={disabled}
            hidden={
              selectedRelationId !== undefined && joinRelation.relationId !== selectedRelationId
            }
            className="min-h-0 border-0 p-0"
            data-relation-id={joinRelation.relationId}
          >
            <SemanticWorkbenchJoinConditionEditor
              renderExpression={
                transformNode == null ||
                (selectedRelationId != null && selectedRelationId !== joinRelation.relationId)
                  ? undefined
                  : (edit, onSelectCondition) => {
                      if (edit != null && edit.condition == null)
                        return (
                          <p role="status" className="text-xs text-amber-200">
                            Completa los operandos para representar la condición.
                          </p>
                        );
                      const previewDraft =
                        edit?.condition == null
                          ? draft
                          : edit.conditionKey == null
                            ? addDvtSubstraitJoinPredicateCondition({
                                draft,
                                joinRelationId: joinRelation.relationId,
                                condition: edit.condition,
                                groupWithPrevious: edit.groupWithPrevious,
                              })
                            : updateDvtSubstraitJoinPredicateCondition({
                                draft,
                                joinRelationId: joinRelation.relationId,
                                conditionKey: edit.conditionKey,
                                condition: edit.condition,
                              });
                      return (
                        <CanvasRelationalJoinExpressionTree
                          transformNode={transformNode}
                          relationId={joinRelation.relationId}
                          draft={previewDraft}
                          onSelectCondition={disabled ? undefined : onSelectCondition}
                        />
                      );
                    }
              }
              onEditingChange={(pending) => trackEditing(joinRelation.relationId, pending)}
              projection={projection}
              rightInputIndex={index + 1}
              conditions={join.conditions}
              onAdd={(condition, groupWithPrevious) =>
                onChange(
                  addDvtSubstraitJoinPredicateCondition({
                    draft,
                    joinRelationId: joinRelation.relationId,
                    condition,
                    groupWithPrevious,
                  })
                )
              }
              onUpdate={(conditionKey, condition) =>
                onChange(
                  updateDvtSubstraitJoinPredicateCondition({
                    draft,
                    joinRelationId: joinRelation.relationId,
                    conditionKey,
                    condition,
                  })
                )
              }
              onRemove={(conditionKey) =>
                onChange(
                  removeDvtSubstraitJoinPredicateCondition({
                    draft,
                    joinRelationId: joinRelation.relationId,
                    conditionKey,
                  })
                )
              }
            />
          </fieldset>
        );
      })}
    </div>
  );
}
