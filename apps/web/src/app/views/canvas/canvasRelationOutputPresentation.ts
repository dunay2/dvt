/** Map selectable outputs to canonical slots while retaining connected-producer presentation. */
import { isSchemaTypeNullable } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasNodePresentationColumn } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanvasPresentationAnalysisEntry } from './canvasPresentationAnalysis';
import { canvasColumnTruth, projectSemanticColumns } from './canvasPresentationColumns';
import { presentCanvasSubstraitFields } from './canvasSubstraitFieldPresentation';
import { relationOutputSlots } from './canvasRelationOutputSchema';

export async function presentRelationOutputSelection(
  entry: CanvasPresentationAnalysisEntry,
  declared: readonly CanvasNodePresentationColumn[],
  inherited: readonly CanvasNodePresentationColumn[],
  sources: readonly CanonicalNode[],
  signal?: AbortSignal
) {
  const root = entry.index.relations.get(entry.index.rootId)!;
  const inputs = await Promise.all(root.inputs.map((id) => entry.session.query(id, signal)));
  const columns = (
    await Promise.all(
      inputs.map((result) =>
        presentCanvasSubstraitFields({ entry, result, inherited, sources, signal })
      )
    )
  ).flat();
  const slots = relationOutputSlots(root, inputs);
  signal?.throwIfAborted();
  const byReference = new Map(columns.map((column) => [column.reference, column]));
  const hidden = slots
    .filter((slot) => slot.output == null)
    .map((slot): CanvasNodePresentationColumn => {
      const origin = byReference.get(slot.key);
      return {
        ...origin,
        reference: slot.key,
        name: slot.name,
        type: origin?.type ?? slot.schema.type.kind.case!,
        nullable: isSchemaTypeNullable(slot.schema.type),
        provenance: 'inherited',
        selected: false,
      };
    });
  if (root.relation.relType.case === 'project') {
    // A computed projection retains the physical catalogue's disclosure and order.
    const truth = projectSemanticColumns(declared, inherited);
    return {
      ...truth,
      visible: truth.visible.map((column) => {
        if (column.provenance !== 'inherited') return column;
        const candidate = hidden.find(
          (field) =>
            field.sourceNodeId === column.sourceNodeId &&
            (field.reference === column.reference || field.sourceFieldName === column.name)
        );
        return candidate == null ? column : { ...column, reference: candidate.reference };
      }),
    };
  }
  return canvasColumnTruth(declared, inherited, [
    ...declared.map((column) => ({ ...column, selected: true })),
    ...hidden,
  ]);
}
