/** Project selected-relation fields and execution identity for scalar output authoring. */
import { useContext } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { inspectProjectionDataType } from './canvasDvtSubstraitProjectionStructure';
import { useCanvasRelationFields } from './useCanvasRelationFields';
import type { DerivedOutputField } from './DerivedOutputOperands';

export function useCanvasDerivedOutputAuthoring(relationId: string) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const schema = useCanvasRelationFields(relationId);
  if (analysis?.document == null || schema.result == null || schema.error != null) return null;
  try {
    const target = analysis.session.locate(relationId, analysis.revision);
    const fields = schema.result.bindings
      .filter((field) => field.parentFieldId == null)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
      .flatMap((field): DerivedOutputField[] => {
        const dataType = inspectProjectionDataType(
          schema.result!.fields[field.outputOrdinal]!.type
        );
        return dataType == null
          ? []
          : [{ fieldId: field.fieldId, name: field.displayName ?? field.fieldId, dataType }];
      });
    return {
      fields,
      intent: target.relation.relType.case === 'project' ? ('edit' as const) : ('insert' as const),
      provider: analysis.session.executionProvider(analysis.revision),
    };
  } catch {
    return null;
  }
}
