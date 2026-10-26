/** Owned concern: bind a selected Read or unary operation to its existing editor owner. */
import type { CanonicalNode } from '../../types/canonical';
import type { ReactNode } from 'react';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { SourceOccurrenceProperties } from './relational-source-occurrence/SourceOccurrenceProperties';
import { useSelectedRelation } from './useSelectedRelation';
import { CanvasSelectedUnaryEditor } from './CanvasSelectedUnaryEditor';
import { CanvasTransformInspector } from './CanvasTransformInspector';

export function CanvasRelationalTreeSelectedOperatorEditor({
  draft,
  operation,
  relationId,
  transformNode,
  onChange,
  onClose,
  onPendingConditionChange,
  reservedAliases,
  sourceOutput,
}: Readonly<{
  draft: DvtSubstraitProjectionDraft;
  operation: CanvasRelationalOperation;
  relationId: string | null;
  transformNode: CanonicalNode;
  onChange: (draft: DvtSubstraitProjectionDraft) => void;
  onClose: () => void;
  onPendingConditionChange?: (pending: boolean) => void;
  reservedAliases?: readonly string[];
  sourceOutput?: ReactNode;
}>): JSX.Element | null {
  const entry = useSelectedRelation(relationId);
  const selected = entry?.relation.relType.case;
  const read = selected === 'read' ? entry?.binding : null;
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
        output={sourceOutput}
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
