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
  if (metadata.modelSql != null) {
    return { outcome: 'rejected', reason: 'not_generated_dbt_model' };
  }
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
