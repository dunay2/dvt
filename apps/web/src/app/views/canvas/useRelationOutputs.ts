/**
 * Owned concern: query selected output slots and canonical calculated descriptions.
 * @baseline ADR-0064: expression identity is read from the same canonical relation revision.
 * @decision Enrich natural slots through the shared dependency model and output eligibility policy.
 * @consequence Retained JOIN slots stay editable without admitting unavailable fields elsewhere.
 * @version 1.1.0
 */
import { useContext, useEffect, useState } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';

export function useRelationOutputs(relationId: string) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [settled, setSettled] = useState<{
    analysis: typeof analysis;
    relationId: string;
    slots: ReturnType<typeof relationOutputSlots>;
    physical: boolean;
  } | null>(null);
  useEffect(() => {
    if (analysis?.document == null || analysis.error != null) return;
    const cancellation = new AbortController();
    const query = async () => {
      const target = analysis.session.locate(relationId, analysis.revision);
      const inputs = await Promise.all(
        target.inputs.map((id) => analysis.session.query(id, cancellation.signal))
      );
      cancellation.signal.throwIfAborted();
      analysis.session.locate(relationId, analysis.revision);
      const dependencies =
        target.relation.relType.case === 'project'
          ? readCanvasTransformDependencyModel(target, (id) =>
              analysis.session.locate(id, analysis.revision)
            )
          : undefined;
      setSettled({
        analysis,
        relationId,
        slots: relationOutputSlots(target, inputs, dependencies).filter((slot) =>
          analysis.session.allowsOutputSchema(relationId, slot.schema)
        ),
        physical: target.relation.relType.case === 'read',
      });
    };
    void query().catch(() => {
      if (!cancellation.signal.aborted) setSettled(null);
    });
    return () => cancellation.abort();
  }, [analysis, relationId]);
  return settled?.relationId === relationId &&
    settled.analysis?.session === analysis?.session &&
    analysis?.error == null
    ? settled
    : null;
}
