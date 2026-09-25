/** Owned concern: bind a selected Read or unary operation to its existing editor owner. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { SourceOccurrenceProperties } from './relational-source-occurrence/SourceOccurrenceProperties';
import { useSelectedRelation } from './useSelectedRelation';
import { CanvasSelectedUnaryEditor } from './CanvasSelectedUnaryEditor';

export function CanvasRelationalTreeSelectedOperatorEditor({
  draft,
  operation,
  relationId,
  transformNode,
  onChange,
  onClose,
  onPendingConditionChange,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: CanvasRelationalOperation;
  relationId: string | null;
  transformNode: CanonicalNode;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  onPendingConditionChange?: (pending: boolean) => void;
}>): JSX.Element | null {
  const entry = useSelectedRelation(relationId);
  const selected = entry?.relation.relType.case;
  const read = entry?.binding.sourceRef == null ? null : entry.binding;
  if (read != null)
    return (
      <SourceOccurrenceProperties
        key={read.relationId}
        draft={draft}
        relationId={read.relationId}
        onChange={onChange}
        onClose={onClose}
        onPendingChange={onPendingConditionChange}
      />
    );
  const tools = {
    filter: 'filter',
    sort: 'sort',
    fetch: 'fetch',
    aggregate: 'aggregate',
    project: 'window',
  } as const;
  const tool = selected != null && selected in tools ? tools[selected as keyof typeof tools] : null;
  if (tool != null && relationId != null) {
    return (
      <CanvasSelectedUnaryEditor
        draft={draft}
        operation={tool}
        transformNode={transformNode}
        modelOperation={operation}
        relationId={relationId}
        onChange={onChange}
        onClose={onClose}
        onPendingChange={onPendingConditionChange}
      />
    );
  }
  return null;
}
