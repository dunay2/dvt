/** Bind one exact relation and its input schema to a discardable Filter form. */
import { useContext, useEffect, useState } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import type { CanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorModel';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { resolveDvtSubstraitFilterCapabilities } from './canvasFilterCapabilities';

export function useSelectedRelationFilter(relationId: string | null, intent: 'insert' | 'edit') {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [settled, setSettled] = useState<{
    analysis: typeof analysis;
    relationId: string | null;
    intent: typeof intent;
    targetId: string;
    tool: CanvasRelationalOperatorTool;
  } | null>(null);
  useEffect(() => {
    if (analysis?.document == null || analysis.error != null) return;
    const cancellation = new AbortController();
    const targetId = relationId ?? analysis.session.rootId;
    const resolve = async () => {
      const target = analysis.session.locate(targetId, analysis.revision);
      const filter = target.relation.relType;
      if (intent === 'edit' && filter.case !== 'filter') return;
      const inputId = intent === 'edit' ? target.inputs[0]! : targetId;
      const schema = await analysis.session.query(inputId, cancellation.signal);
      analysis.session.locate(targetId, analysis.revision);
      cancellation.signal.throwIfAborted();
      const predicate =
        intent === 'edit' && filter.case === 'filter'
          ? dvtSubstraitTextComparison.inspect(target.plan, filter.value.condition)
          : null;
      const fields = schema.bindings
        .filter(
          (field) =>
            field.parentFieldId == null &&
            schema.fields[field.outputOrdinal]?.type.kind.case === 'string'
        )
        .map((field) => ({
          fieldId: field.fieldId,
          name: field.displayName ?? field.fieldId,
          dataType: 'string',
        }));
      const comparisons = resolveDvtSubstraitFilterCapabilities({ dataType: 'string' });
      setSettled({
        analysis,
        relationId,
        intent,
        targetId,
        tool: {
          id: 'filter',
          active: intent === 'edit',
          fields,
          comparisons,
          enabled:
            fields.length > 0 &&
            comparisons.length > 0 &&
            (intent === 'insert' || predicate != null),
          fieldId:
            predicate == null
              ? undefined
              : schema.bindings.find(
                  (field) =>
                    field.parentFieldId == null && field.outputOrdinal === predicate.sourceOrdinal
                )?.fieldId,
          capabilityId: predicate?.capabilityId,
          value: predicate?.value,
        },
      });
    };
    void resolve().catch(() => {
      if (!cancellation.signal.aborted) setSettled(null);
    });
    return () => cancellation.abort();
  }, [analysis, relationId, intent]);
  return settled?.analysis === analysis &&
    settled?.relationId === relationId &&
    settled?.intent === intent
    ? settled
    : null;
}
