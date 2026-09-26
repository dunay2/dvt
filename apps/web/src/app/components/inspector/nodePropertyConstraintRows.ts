/** Owned concern: nodePropertyConstraintRows. */

import type { InspectorColumn, NodePropertyTableRow } from './nodePropertiesContracts';
import { isRecord, readString, readStringArray, readBoolean } from './nodePropertyValues';

export function buildKeyRows(
  metadata: Record<string, unknown>,
  columns: readonly InspectorColumn[]
): readonly NodePropertyTableRow[] {
  const rows: NodePropertyTableRow[] = [];
  const primaryKeyColumns = columns
    .filter((column) => column.primaryKey)
    .map((column) => column.name);

  if (primaryKeyColumns.length > 0) {
    rows.push({
      id: `pk:${primaryKeyColumns.join(',')}`,
      cells: {
        name: 'Primary key',
        columns: primaryKeyColumns.join(', '),
        type: 'primary',
      },
    });
  }

  const uniqueKeys = Array.isArray(metadata.uniqueKeys) ? metadata.uniqueKeys : [];
  for (const candidate of uniqueKeys) {
    if (!isRecord(candidate)) {
      continue;
    }

    const name = readString(candidate.name);
    const keyColumns = readStringArray(candidate.columns);
    if (name == null || keyColumns.length === 0) {
      continue;
    }

    rows.push({
      id: `unique:${name}`,
      cells: {
        name,
        columns: keyColumns.join(', '),
        type: 'unique',
      },
    });
  }

  return rows;
}

export function buildIndexRows(metadata: Record<string, unknown>): readonly NodePropertyTableRow[] {
  const indexes = Array.isArray(metadata.indexes) ? metadata.indexes : [];
  return indexes.flatMap((candidate): readonly NodePropertyTableRow[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name);
    if (name == null) {
      return [];
    }

    return [
      {
        id: name,
        cells: {
          name,
          type: readString(candidate.type) ?? '',
          columns: readStringArray(candidate.columns).join(', '),
          unique: readBoolean(candidate.unique) ? 'yes' : 'no',
        },
      },
    ];
  });
}

export function buildForeignKeyRows(
  metadata: Record<string, unknown>
): readonly NodePropertyTableRow[] {
  const foreignKeys = Array.isArray(metadata.foreignKeys) ? metadata.foreignKeys : [];
  return foreignKeys.flatMap((candidate): readonly NodePropertyTableRow[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name);
    if (name == null) {
      return [];
    }

    return [
      {
        id: name,
        cells: {
          name,
          localColumns: readStringArray(candidate.localColumns).join(', '),
          referencedTable: readString(candidate.referencedTable) ?? '',
          referencedColumns: readStringArray(candidate.referencedColumns).join(', '),
        },
      },
    ];
  });
}

export function buildConstraintRows(
  metadata: Record<string, unknown>
): readonly NodePropertyTableRow[] {
  const constraints = Array.isArray(metadata.constraints) ? metadata.constraints : [];
  return constraints.flatMap((candidate): readonly NodePropertyTableRow[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name);
    if (name == null) {
      return [];
    }

    return [
      {
        id: name,
        cells: {
          name,
          type: readString(candidate.type) ?? 'check',
          expression: readString(candidate.expression) ?? readString(candidate.check) ?? '',
        },
      },
    ];
  });
}
