/** Owned concern: bind a selected Read or unary operation to its existing editor owner. */
import type { CanonicalNode } from '../../types/canonical';
import { useMemo } from 'react';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { SourceOccurrenceProperties } from './relational-source-occurrence/SourceOccurrenceProperties';
import { useSelectedRelation } from './useSelectedRelation';
import { CanvasSelectedUnaryEditor } from './CanvasSelectedUnaryEditor';
import { CanvasTransformInspector } from './CanvasTransformInspector';
import type { CanvasSourceInputRecovery } from './canvasSourceOccurrenceInputRecovery';

export function CanvasRelationalTreeSelectedOperatorEditor({
  draft,
  operation,
  relationId,
  transformNode,
  onChange,
  onClose,
  onPendingConditionChange,
  reservedAliases,
  sourceOutputFieldsByRelationId,
  sourceInputRecovery,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: CanvasRelationalOperation;
  relationId: string | null;
  transformNode: CanonicalNode;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  onPendingConditionChange?: (pending: boolean) => void;
  reservedAliases?: readonly string[];
  sourceOutputFieldsByRelationId: ReadonlyMap<string, readonly string[]>;
  sourceInputRecovery?: CanvasSourceInputRecovery;
}>): JSX.Element | null {
  const entry = useSelectedRelation(relationId);
  const retainedRead = useMemo(() => {
    if (entry != null || relationId == null) return null;
    const indexed = indexSubstraitRelations(draft);
    const selected = indexed.ok ? indexed.index.relations.get(relationId) : null;
    return selected?.relation.relType.case === 'read' ? selected.binding : null;
  }, [entry, draft, relationId]);
  const selected = entry?.relation.relType.case;
  const read = selected === 'read' ? entry?.binding : retainedRead;
  if (selected === 'project' && relationId != null)
    return (
      <CanvasTransformInspector
        key={relationId}
        relationId={relationId}
        transformNode={transformNode}
        draft={draft}
        onChange={onChange}
        onClose={onClose}
        onPendingChange={onPendingConditionChange}
      />
    );
  if (read != null)
    return (
      <SourceOccurrenceProperties
        publishedFieldNames={sourceOutputFieldsByRelationId.get(read.relationId) ?? []}
        sourceInputRecovery={sourceInputRecovery}
        key={read.relationId}
        draft={draft}
        relationId={read.relationId}
        reservedAliases={reservedAliases}
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
