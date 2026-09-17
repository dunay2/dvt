/** Owned concern: edit predicates already stored in one canonical JOIN draft. */
import { useCallback, useEffect, useState } from 'react';
import {
  addDvtSubstraitJoinPredicateCondition,
  removeDvtSubstraitJoinPredicateCondition,
  updateDvtSubstraitJoinPredicateCondition,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import { SemanticWorkbenchJoinConditionEditor } from './SemanticWorkbenchJoinConditionEditor';

export function DvtSubstraitJoinPredicateEditors({
  disabled,
  draft,
  projection,
  onChange,
  onPendingConditionChange,
}: Readonly<{
  disabled: boolean;
  draft: DvtSubstraitInnerJoinDraft;
  projection: DvtSubstraitNInputJoinProjection;
  onChange: (draft: DvtSubstraitInnerJoinDraft) => void;
  onPendingConditionChange?: (pending: boolean) => void;
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
    <div className="space-y-3" data-slot="dvt-substrait-join-predicate-editors">
      {projection.joins.map((join, index) => {
        const joinRelation = projection.joinRelations[index];
        if (joinRelation == null) return null;
        return (
          <fieldset
            key={joinRelation.relationId}
            disabled={disabled}
            className="border-0 p-0"
            data-relation-id={joinRelation.relationId}
          >
            <SemanticWorkbenchJoinConditionEditor
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
