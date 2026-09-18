/** Owned concern: show only the selected JOIN's predicates and its edit action. */
import { Pencil } from 'lucide-react';
import type { CanonicalNode } from '../../types/canonical';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasRelationalJoinIcon } from './CanvasRelationalJoinIcon';
import { readCanvasJoinColumnOutputs } from './canvasJoinColumnOutputModel';
import { resolveDvtSubstraitJoinUnaryFunctions } from './canvasDvtSubstraitJoinOperand';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { projectSemanticWorkbenchJoinConditionRows } from './SemanticWorkbenchJoinConditionEditor';

export function CanvasRelationalTreeNodeDetail({
  node,
  transformNode,
  onEdit,
}: Readonly<{
  node: CanvasRelationalTreeNode | null;
  transformNode: CanonicalNode;
  onEdit?: () => void;
}>): JSX.Element | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const entry = readCanvasJoinColumnOutputs(transformNode);
  if (node?.operator !== 'join' || entry == null) return null;
  const index = entry.projection.joinRelations.findIndex(
    (relation) => relation.relationId === node.relationId
  );
  const join = entry.projection.joins[index];
  if (join == null) return null;
  const fields = entry.projection.inputs.slice(0, index + 2).flatMap((input) =>
    input.fields.map((field) => ({
      ...field,
      label: `${input.table}.${field.name}`,
    }))
  );
  const rows = projectSemanticWorkbenchJoinConditionRows({
    conditions: join.conditions,
    fieldLabelById: new Map(fields.map((field) => [field.fieldId, field.label])),
    functionNameById: new Map(
      [...new Set(fields.map((field) => field.dataType))].flatMap((dataType) =>
        resolveDvtSubstraitJoinUnaryFunctions({ dataType, provider: 'postgres' }).map(
          (fn) => [fn.capabilityId, fn.name] as const
        )
      )
    ),
  });
  return (
    <section
      data-slot="canvas-relational-tree-detail"
      data-position="contextual"
      className="max-h-[30%] shrink-0 overflow-auto border-t border-(--border-subtle) px-4 py-2"
    >
      <div className="max-w-4xl">
        <header className="flex items-center gap-2 text-xs">
          <CanvasRelationalJoinIcon className="size-4 text-(--status-info)" />
          <strong>INNER JOIN</strong>
          {onEdit == null ? null : (
            <button
              type="button"
              data-slot="canvas-relational-edit-selected"
              onClick={onEdit}
              className="ml-auto flex items-center gap-1.5 rounded px-2 py-1 hover:bg-(--surface-selected)"
            >
              <Pencil className="size-3" aria-hidden="true" />
              {copy.editConditions}
            </button>
          )}
        </header>
        <div className="mt-1 space-y-1">
          {rows.map((row, ordinal) => (
            <div
              key={ordinal}
              data-slot="semantic-workbench-join-condition-row"
              className="break-words font-mono text-xs text-(--text-primary)"
              style={{ paddingLeft: row.depth * 12 }}
            >
              {row.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
