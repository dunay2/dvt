/** Owned concern: map recursive Canvas presentation truth into graph-card columns. */
import type {
  CanvasNodePresentationColumn,
  CanvasNodePresentationTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { GraphNodeColumn } from '../../plugins/graph/graphNodeColumnContracts';

export function projectGraphNodeColumn(
  column: CanvasNodePresentationColumn,
  output: boolean
): GraphNodeColumn {
  return {
    ...(column.reference == null ? {} : { id: column.reference }),
    name: column.name,
    type: column.type,
    output,
    ...(column.nullable == null ? {} : { nullable: column.nullable }),
    ...(column.primaryKey == null ? {} : { primaryKey: column.primaryKey }),
    ...(column.sourceNodeName == null ? {} : { sourceNodeName: column.sourceNodeName }),
    ...(column.sourceFieldName == null ? {} : { sourceFieldName: column.sourceFieldName }),
    ...(column.sourceReference == null ? {} : { sourceReference: column.sourceReference }),
    ...(column.reference == null ? {} : { reference: column.reference }),
    ...(column.operations == null ? {} : { operations: column.operations }),
    ...(column.description == null ? {} : { description: column.description }),
    ...(column.children == null
      ? {}
      : {
          children: column.children.map((child) => projectGraphNodeColumn(child, output)),
        }),
  };
}

function representsInheritedInput(
  column: CanvasNodePresentationColumn,
  inherited: CanvasNodePresentationColumn
): boolean {
  if (column.reference != null && column.reference === inherited.reference) return true;
  if (column.sourceNodeId == null || column.sourceNodeId !== inherited.sourceNodeId) return false;
  if (column.provenance === 'inherited' && column.name === inherited.name) return true;
  return (
    column.sourceFieldName === inherited.name &&
    column.name === inherited.name &&
    (column.operations == null || column.operations.length === 0)
  );
}

export function selectGraphNodeCardColumns(
  truth: CanvasNodePresentationTruth
): readonly CanvasNodePresentationColumn[] {
  if (truth.relationalComposition?.state !== 'pending') return truth.columns.visible;

  return [
    ...truth.columns.visible,
    ...truth.columns.inherited.filter(
      (inherited) =>
        !truth.columns.visible.some((column) => representsInheritedInput(column, inherited))
    ),
  ];
}
