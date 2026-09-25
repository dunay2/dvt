/** Inspector adapter: one analysis lifetime, one canonical relation selection, reusable forms. */
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { DvtSubstraitTransformAuthoringMetadata } from './canvasDvtAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasRelationOperatorFields } from './CanvasRelationOperatorFields';
import { canvasViewCopy } from './copy';

export function DvtRelationAuthoringSection({
  nodeId,
  disabled,
  draft,
  outputNameDrafts,
  onChange,
}: Readonly<{
  nodeId: string;
  disabled: boolean;
  draft: DvtSubstraitTransformAuthoringMetadata;
  outputNameDrafts?: Readonly<Record<string, string>>;
  onChange: Dispatch<SetStateAction<CanvasInspectorNodeDraft>>;
}>) {
  const document = useMemo(
    () => ({ plan: draft.plan, sidecar: draft.sidecar }),
    [draft.plan, draft.sidecar]
  );
  const analysis = useCanvasRelationAnalysisSession(document, nodeId);
  const [selected, setSelected] = useState<string | null>(null);
  const relationId =
    analysis?.error != null
      ? null
      : document.sidecar.relations.some((entry) => entry.relationId === selected)
        ? selected
        : analysis?.session.rootId;
  const change = (next: SubstraitDocument) =>
    onChange((current) => {
      if (current.dvt?.kind !== 'transform' || current.dvt.mode !== 'substrait') return current;
      const fields = new Map(
        next.sidecar.fields.map((field) => [field.fieldId, field.displayName])
      );
      const retained = Object.fromEntries(
        Object.entries(current.outputNameDrafts ?? {}).filter(
          ([id, name]) => fields.has(id) && fields.get(id) !== name
        )
      );
      return { ...current, dvt: { ...current.dvt, ...next }, outputNameDrafts: retained };
    });
  return (
    <CanvasRelationAnalysisContext.Provider value={analysis}>
      <section className="space-y-3" data-slot="dvt-relation-authoring">
        <select
          aria-label={canvasViewCopy.inspectorDvtRelationalOperationTitle}
          value={relationId ?? ''}
          className="w-full border border-(--border-default) bg-(--surface-panel) p-2 text-sm"
          onChange={(event) => setSelected(event.currentTarget.value)}
        >
          {document.sidecar.relations.map((entry) => (
            <option key={entry.relationId} value={entry.relationId}>
              {entry.displayName ?? entry.relationId}
            </option>
          ))}
        </select>
        {analysis?.error != null ? (
          <p role="alert">{canvasViewCopy.relationalTreeInvalidMessage}</p>
        ) : null}
        {relationId == null || analysis?.error != null ? null : (
          <CanvasRelationOperatorFields
            key={relationId}
            relationId={relationId}
            document={document}
            disabled={disabled}
            onChange={change}
            outputNames={{
              values: outputNameDrafts ?? {},
              onChange: (fieldId, value) =>
                onChange((current) => ({
                  ...current,
                  outputNameDrafts: { ...current.outputNameDrafts, [fieldId]: value },
                })),
            }}
          />
        )}
      </section>
    </CanvasRelationAnalysisContext.Provider>
  );
}
