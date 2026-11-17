/** Adapt authorized physical/native publications to the SQL input namespace. */
import { ConnectedSourceRefSchema, type WorkspaceGraphAuthoringNode } from '@dvt/contracts';
import { resolvePostgresInputDataType, sourceFieldType } from '@dvt/postgres-projection';
import {
  deriveSubstraitSchemas,
  isSchemaTypeNullable,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import {
  CanvasModelSqlUnavailableError,
  type ModelSqlPublishedInput,
} from '../ports/canvasModelSql.js';

import { dvtSourcePublication } from './dvtSourcePublication.js';

export function physicalModelSqlPublication(
  node: WorkspaceGraphAuthoringNode
): ModelSqlPublishedInput {
  const ref = ConnectedSourceRefSchema.parse(node.metadata?.connectedSourceRef);
  const schema = node.metadata?.['schema'];
  const table = node.metadata?.['tableName'];
  if (
    ref.connectionRef.provider !== 'postgres' ||
    typeof schema !== 'string' ||
    typeof table !== 'string' ||
    !schema ||
    !table
  )
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  const publication = dvtSourcePublication(node);
  const raw = node.metadata?.['columns'];
  if (!Array.isArray(raw)) throw new CanvasModelSqlUnavailableError('input_unavailable');
  // Existing imported Sources without a custom output publish their catalog columns.
  // Legacy absent nullability remains unknown; it cannot authorize typed SQL operations.
  const catalogColumns = raw.map((value: unknown) => {
    if (
      value == null ||
      typeof value !== 'object' ||
      !('name' in value) ||
      typeof value.name !== 'string' ||
      !value.name
    )
      throw new CanvasModelSqlUnavailableError('input_unavailable');
    const nullable =
      'nullable' in value && typeof value.nullable === 'boolean' ? value.nullable : null;
    const type =
      nullable != null && 'type' in value && typeof value.type === 'string'
        ? resolvePostgresInputDataType(value.type)
        : null;
    return {
      id: value.name,
      name: value.name,
      nullable,
      dataType: type,
      type: sourceFieldType(type, nullable ?? false),
    };
  });
  const columns = catalogColumns.filter(
    (column) => publication == null || publication.has(column.name)
  );
  if (new Set(columns.map((column) => column.id)).size !== columns.length)
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return {
    name: node.name,
    connection: ref.connectionRef,
    input: {
      nodeId: node.id,
      sqlName: node.name,
      columns,
      source: { sourceRef: ref, names: [schema, table], columns: catalogColumns },
    },
    columns: columns.map(({ id, name, dataType, nullable }) => ({ id, name, dataType, nullable })),
  };
}

export function producerModelSqlPublication(
  node: WorkspaceGraphAuthoringNode,
  document: SubstraitDocument,
  connection: ModelSqlPublishedInput['connection']
): ModelSqlPublishedInput {
  const { index, schemas } = deriveSubstraitSchemas(document);
  const root = index.relations.get(index.rootId)!;
  const schema = schemas.get(index.rootId)!;
  const fields = root.fields
    .filter((field) => field.parentFieldId == null)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal);
  if (fields.length !== root.fields.length || fields.length !== schema.length)
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  const columns = fields.map((field, ordinal) => ({
    id: field.fieldId,
    name: field.displayName ?? '',
    type: schema[ordinal]!.type,
  }));
  return {
    name: node.name,
    connection,
    input: {
      nodeId: node.id,
      sqlName: node.name,
      columns,
      source: { producer: { nodeId: node.id, document } },
    },
    columns: columns.map((column) => ({
      id: column.id,
      name: column.name,
      dataType: column.type.kind.case === 'unbound' ? null : (column.type.kind.case ?? null),
      nullable: column.type.kind.case === 'unbound' ? null : isSchemaTypeNullable(column.type),
    })),
  };
}
