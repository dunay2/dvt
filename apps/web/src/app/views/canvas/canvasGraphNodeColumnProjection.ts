/** Owned concern: map recursive Canvas presentation truth into graph-card columns. */
import type { CanvasNodePresentationColumn } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { GraphNodeColumn } from '../../plugins/graph/graphNodeColumnContracts';

export function projectGraphNodeColumn(
  column: CanvasNodePresentationColumn,
  output: boolean
): GraphNodeColumn {
  return {
    name: column.name,
    type: column.type,
    output,
    ...(column.nullable == null ? {} : { nullable: column.nullable }),
    ...(column.primaryKey == null ? {} : { primaryKey: column.primaryKey }),
    ...(column.sourceNodeName == null ? {} : { sourceNodeName: column.sourceNodeName }),
    ...(column.sourceFieldName == null ? {} : { sourceFieldName: column.sourceFieldName }),
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
