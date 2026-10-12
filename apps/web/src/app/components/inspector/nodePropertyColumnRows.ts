/** Owned concern: nodePropertyColumnRows. */

import type { CanvasNodePresentationColumn } from '../canvas/canvasNodePresentationTruth.contract';
import { flattenStructuredColumns } from './structuredColumnPresentation';
import type { InspectorColumn, NodePropertyTableRow } from './nodePropertiesContracts';
import { isRecord, readString, readFirstString, readBoolean } from './nodePropertyValues';

export function readColumns(value: unknown): readonly InspectorColumn[] {
  const readColumn = (candidate: unknown, fallbackName?: string): readonly InspectorColumn[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name) ?? fallbackName;
    if (name == null) {
      return [];
    }

    return [
      {
        name,
        type: readFirstString(candidate.type, candidate.dataType, candidate.data_type) ?? 'unknown',
        nullable: readBoolean(candidate.nullable),
        primaryKey: readBoolean(candidate.primaryKey) ?? readBoolean(candidate.isPrimaryKey),
        defaultValue: readFirstString(candidate.default, candidate.defaultValue),
        comment: readFirstString(candidate.description, candidate.comment),
      },
    ];
  };

  if (Array.isArray(value)) {
    return value.flatMap((candidate): readonly InspectorColumn[] => readColumn(candidate));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, candidate]): readonly InspectorColumn[] =>
      readColumn(candidate, key)
    );
  }

  return [];
}

export function buildColumnRows(
  columns: readonly InspectorColumn[]
): readonly NodePropertyTableRow[] {
  return columns.map((column) => ({
    id: column.name,
    cells: {
      name: column.name,
      type: column.type,
      nullable: column.nullable === false ? 'not null' : column.nullable === true ? 'nullable' : '',
      key: column.primaryKey ? 'PK' : '',
      default: column.defaultValue ?? '',
      comment: column.comment ?? '',
    },
  }));
}

export function buildInheritedColumnRows(
  columns: readonly CanvasNodePresentationColumn[]
): readonly NodePropertyTableRow[] {
  return columns.map((column) => ({
    id: column.reference ?? `${column.sourceNodeId ?? 'input'}.${column.name}`,
    cells: {
      name: column.name,
      type: column.type,
      nullable: column.nullable === false ? 'not null' : column.nullable === true ? 'nullable' : '',
      source: column.sourceNodeName ?? column.sourceNodeId ?? '',
      reference: column.sourceReference ?? column.reference ?? '',
      selection: column.selected ? 'selected' : 'available',
    },
  }));
}

export function buildDvtTransformColumnRows(
  columns: readonly CanvasNodePresentationColumn[],
  declaredColumns: readonly InspectorColumn[]
): readonly NodePropertyTableRow[] {
  if (columns.length === 0) {
    return buildColumnRows(declaredColumns);
  }

  const declaredByName = new Map(declaredColumns.map((column) => [column.name, column]));
  return flattenStructuredColumns(columns).map(({ column, path }) => {
    const declared = declaredByName.get(column.name);
    const nullable = column.nullable ?? declared?.nullable;
    const carriesSourceProvenance =
      column.sourceNodeId != null ||
      column.sourceNodeName != null ||
      column.sourceReference != null;

    return {
      id:
        column.reference ??
        (carriesSourceProvenance
          ? `${column.sourceNodeId ?? 'input'}.${column.name}`
          : column.name),
      cells: {
        name: path,
        type: column.type === 'unknown' && declared != null ? declared.type : column.type,
        nullable: nullable === false ? 'not null' : nullable === true ? 'nullable' : '',
        key: declared?.primaryKey ? 'PK' : '',
        default: declared?.defaultValue ?? '',
        comment: column.description ?? declared?.comment ?? '',
        ...(carriesSourceProvenance
          ? {
              source: column.sourceNodeName ?? column.sourceNodeId ?? '',
              reference: column.sourceReference ?? column.reference ?? '',
              selection: column.selected ? 'selected' : 'available',
            }
          : {}),
      },
    };
  });
}
