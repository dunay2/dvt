/** Owned concern: mutate the ordered output projection of one generated DBT model. */
import type { CanonicalNode } from '../../types/canonical';
import {
  applyDbtNodeAuthoringMetadata,
  createDbtNodeAuthoringMetadata,
  type DbtModelProjectionColumn,
} from './canvasDbtAuthoringModel';

export type DbtModelColumnAuthoringRejection =
  'not_generated_dbt_model' | 'column_not_found' | 'projection_columns_invalid' | 'output_required';

export type DbtModelColumnAuthoringResult =
  | Readonly<{ outcome: 'applied'; node: CanonicalNode }>
  | Readonly<{ outcome: 'rejected'; reason: DbtModelColumnAuthoringRejection }>;

function uniqueColumnNames(columnNames: readonly string[]): string[] {
  return [...new Set(columnNames.map((name) => name.trim()).filter((name) => name.length > 0))];
}

export function validateDbtModelProjectionColumns(
  projectionColumns: readonly DbtModelProjectionColumn[] | null,
  availableColumns: readonly string[]
): DbtModelColumnAuthoringRejection | null {
  if (projectionColumns == null) return null;
  const available = new Set(uniqueColumnNames(availableColumns));
  const recorded = new Set<string>();
  for (const column of projectionColumns) {
    if (recorded.has(column.name) || !available.has(column.name)) {
      return 'projection_columns_invalid';
    }
    recorded.add(column.name);
  }
  return projectionColumns.some((column) => column.output) ? null : 'output_required';
}

export function resolveDbtModelProjectionColumns(
  projectionColumns: readonly DbtModelProjectionColumn[] | null,
  availableColumns: readonly string[]
): readonly DbtModelProjectionColumn[] {
  const available = uniqueColumnNames(availableColumns);
  if (projectionColumns == null) {
    return available.map((name) => ({ name, output: true }));
  }
  const availableSet = new Set(available);
  const recordedNames = new Set(projectionColumns.map((column) => column.name));
  return [
    ...projectionColumns.filter((column) => availableSet.has(column.name)),
    ...available
      .filter((name) => !recordedNames.has(name))
      .map((name) => ({ name, output: false })),
  ];
}

export function projectDbtModelColumnStates<TColumn extends Readonly<{ name: string }>>(
  node: CanonicalNode,
  availableColumns: readonly TColumn[]
): readonly Readonly<{ column: TColumn; output: boolean }>[] {
  const columnByName = new Map(availableColumns.map((column) => [column.name, column]));
  const states = resolveDbtModelProjectionColumns(
    createDbtNodeAuthoringMetadata(node).projectionColumns,
    availableColumns.map((column) => column.name)
  );
  return states.flatMap((state) => {
    const column = columnByName.get(state.name);
    return column == null ? [] : [{ column, output: state.output }];
  });
}

export function setDbtModelProjectionColumnOutput(args: {
  node: CanonicalNode;
  availableColumns: readonly string[];
  columnName: string;
  output: boolean;
}): DbtModelColumnAuthoringResult {
  if (args.node.pluginId !== 'dbt' || args.node.kind !== 'dbt:model') {
    return { outcome: 'rejected', reason: 'not_generated_dbt_model' };
  }
  const availableColumns = uniqueColumnNames(args.availableColumns);
  if (!availableColumns.includes(args.columnName)) {
    return { outcome: 'rejected', reason: 'column_not_found' };
  }
  const metadata = createDbtNodeAuthoringMetadata(args.node);
  const projectionColumns = resolveDbtModelProjectionColumns(
    metadata.projectionColumns,
    availableColumns
  ).map((column) =>
    column.name === args.columnName ? { ...column, output: args.output } : column
  );
  const rejection = validateDbtModelProjectionColumns(projectionColumns, availableColumns);
  if (rejection != null) return { outcome: 'rejected', reason: rejection };

  return {
    outcome: 'applied',
    node: applyDbtNodeAuthoringMetadata(args.node, { ...metadata, projectionColumns }),
  };
}

export function reorderDbtModelProjectionColumn(args: {
  node: CanonicalNode;
  availableColumns: readonly string[];
  columnName: string;
  targetColumnName: string;
  placement: 'before' | 'after';
}): DbtModelColumnAuthoringResult {
  if (args.node.pluginId !== 'dbt' || args.node.kind !== 'dbt:model') {
    return { outcome: 'rejected', reason: 'not_generated_dbt_model' };
  }
  const availableColumns = uniqueColumnNames(args.availableColumns);
  if (
    args.columnName === args.targetColumnName ||
    !availableColumns.includes(args.columnName) ||
    !availableColumns.includes(args.targetColumnName)
  ) {
    return { outcome: 'rejected', reason: 'column_not_found' };
  }
  const metadata = createDbtNodeAuthoringMetadata(args.node);
  const projectionColumns = [
    ...resolveDbtModelProjectionColumns(metadata.projectionColumns, availableColumns),
  ];
  const sourceIndex = projectionColumns.findIndex((column) => column.name === args.columnName);
  const [movedColumn] = projectionColumns.splice(sourceIndex, 1);
  const targetIndex = projectionColumns.findIndex(
    (column) => column.name === args.targetColumnName
  );
  if (movedColumn == null || targetIndex < 0) {
    return { outcome: 'rejected', reason: 'column_not_found' };
  }
  projectionColumns.splice(
    args.placement === 'after' ? targetIndex + 1 : targetIndex,
    0,
    movedColumn
  );
  const rejection = validateDbtModelProjectionColumns(projectionColumns, availableColumns);
  if (rejection != null) return { outcome: 'rejected', reason: rejection };

  return {
    outcome: 'applied',
    node: applyDbtNodeAuthoringMetadata(args.node, { ...metadata, projectionColumns }),
  };
}
