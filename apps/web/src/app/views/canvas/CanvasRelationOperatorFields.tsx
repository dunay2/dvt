/** Compose existing relation forms without branching on whole-model shapes. */
import { useContext, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { CanvasRelationalTreeOperatorForm } from './CanvasRelationalTreeOperatorForm';
import { useSelectedRelationTool, useSelectedRelationTools } from './useSelectedRelationTool';
import { CanvasRelationOutputs, type RelationOutputNames } from './CanvasRelationOutputs';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import { resolveCanvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';

const unary = {
  filter: 'filter',
  sort: 'sort',
  fetch: 'fetch',
  aggregate: 'aggregate',
  project: 'window',
} as const;

function SelectedUnaryFields({
  relationId,
  operation,
  document,
  onChange,
}: Readonly<{
  relationId: string;
  operation: CanvasRelationalOperatorTool['id'];
  document: SubstraitDocument;
  onChange: (document: SubstraitDocument) => void;
}>) {
  const selected = useSelectedRelationTool(relationId, operation, 'edit');
  const [open, setOpen] = useState(true);
  if (selected == null || !selected.tool.enabled) return null;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)}>
        {operation}
      </button>
    );
  return (
    <CanvasRelationalTreeOperatorForm
      inline
      tool={selected.tool}
      draft={document}
      targetRelationId={relationId}
      title={operation}
      onChange={onChange}
      onClose={() => setOpen(false)}
    />
  );
}

export function CanvasRelationOperatorFields({
  relationId,
  document,
  disabled,
  onChange,
  outputNames,
}: Readonly<{
  relationId: string;
  document: SubstraitDocument;
  disabled: boolean;
  outputNames?: RelationOutputNames;
  onChange: (document: SubstraitDocument) => void;
}>) {
  const copy = resolveCanvasViewCopy(useApplicationLanguageStore((state) => state.language));
  const analysis = useContext(CanvasRelationAnalysisContext);
  const tools = useSelectedRelationTools(document, relationId);
  const [adding, setAdding] = useState<CanvasRelationalOperatorTool['id'] | null>(null);
  const tool = tools.tools.find((candidate) => candidate.id === adding);
  if (
    analysis?.document == null ||
    analysis.error != null ||
    analysis.revision !== analysis.session.revision
  )
    return null;
  const operator = analysis.session.locate(relationId, analysis.revision).relation.relType.case;
  const selected =
    operator != null && operator in unary ? unary[operator as keyof typeof unary] : null;
  return (
    <div className="space-y-4">
      {operator === 'join' ? (
        <CanvasRelationalTreeJoinEditor
          selectedRelationId={relationId}
          copy={copy}
          disabled={disabled}
          onChange={onChange}
        />
      ) : null}
      {!disabled && selected != null ? (
        <SelectedUnaryFields
          relationId={relationId}
          document={document}
          operation={selected}
          onChange={onChange}
        />
      ) : null}
      <CanvasRelationOutputs
        relationId={relationId}
        disabled={disabled}
        onChange={onChange}
        names={outputNames}
      />
      <select
        aria-label={copy.inspectorDvtRelationalOperationTitle}
        value={adding ?? ''}
        disabled={disabled}
        className="w-full border border-(--border-default) bg-(--surface-panel) p-2 text-sm"
        onChange={(event) =>
          setAdding(event.currentTarget.value as CanvasRelationalOperatorTool['id'])
        }
      >
        <option value="" disabled>
          {copy.inspectorDvtRelationalOperationTitle}
        </option>
        {tools.tools.map((option) => (
          <option key={option.id} value={option.id} disabled={!option.enabled}>
            {copy[resolveCanvasRelationalOperationPresentation(option.id).labelKey]}
          </option>
        ))}
      </select>
      {!disabled && tool != null ? (
        <CanvasRelationalTreeOperatorForm
          tool={tool}
          draft={document}
          title={copy[resolveCanvasRelationalOperationPresentation(tool.id).labelKey]}
          targetRelationId={relationId}
          onChange={onChange}
          onClose={() => setAdding(null)}
        />
      ) : null}
    </div>
  );
}
