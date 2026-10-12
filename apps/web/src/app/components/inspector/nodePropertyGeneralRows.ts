/** Owned concern: nodePropertyGeneralRows. */

import { ConnectedSourceRefSchema } from '@dvt/contracts';
import { formatCompactNumber } from '../canvas/formatCompactNumber';
import { readNodeLastExecution } from '../canvas/nodeLastExecution';
import type { CanvasNodePresentationCopy } from '../canvas/canvasNodePresentationCopy.contract';
import type { CanonicalNode } from '../../types/canonical';
import type { NodePropertyRow } from './nodePropertiesContracts';
import { asRecord, addRow, readFirstString, readString } from './nodePropertyValues';
import { NODE_PROPERTY_ROW_ID } from './nodePropertiesContracts';

export function buildGeneralRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>,
  copy?: CanvasNodePresentationCopy
): NodePropertyRow[] {
  const config = asRecord(metadata.config);
  const dbt = asRecord(metadata.dbt);
  const rows: NodePropertyRow[] = [];

  addRow(rows, NODE_PROPERTY_ROW_ID.name, 'Name', node.name);
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.package,
    'Package',
    readFirstString(dbt.packageName, metadata.packageName, metadata.package)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.materialization,
    'Materialization',
    readFirstString(
      config.materialization,
      config.materialized,
      dbt.materialized,
      metadata.materialization,
      metadata.materialized
    )
  );
  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(metadata.connectedSourceRef);
  if (connectedSourceRef.success) {
    addRow(
      rows,
      NODE_PROPERTY_ROW_ID.connection,
      'Connection',
      [
        readString(metadata.connectionName),
        connectedSourceRef.data.connectionRef.provider,
        connectedSourceRef.data.connectionRef.connectionId,
      ]
        .filter((value): value is string => value != null)
        .join(' · ')
    );
  }
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.database,
    'Database',
    readFirstString(config.database, metadata.database, dbt.databaseName)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.schema,
    'Schema',
    readFirstString(config.schema, metadata.schema, dbt.schemaName)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.table,
    'Table',
    readFirstString(config.table, metadata.tableName, dbt.tableName)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.source,
    'Source',
    readFirstString(config.alias, metadata.sourceName, dbt.sourceName)
  );
  addRow(rows, NODE_PROPERTY_ROW_ID.path, 'Path', node.path ?? readString(metadata.path));
  addRow(rows, NODE_PROPERTY_ROW_ID.owner, 'Owner', readString(metadata.owner));

  if (node.role === 'transform') {
    const execution = readNodeLastExecution(metadata);
    const value =
      execution == null
        ? 'Not calculated'
        : execution.kind === 'timestamp'
          ? execution.at
          : `${formatCompactNumber(execution.minutes)} min`;
    addRow(rows, NODE_PROPERTY_ROW_ID.lastRun, copy?.rowLabels?.['last-run'] ?? 'Last run', value);
  }

  if (node.lastDuration != null) {
    addRow(rows, NODE_PROPERTY_ROW_ID.duration, 'Duration', `${node.lastDuration}s`);
  }
  if (node.lastCost != null) {
    addRow(rows, NODE_PROPERTY_ROW_ID.cost, 'Cost', `$${node.lastCost.toFixed(2)}`);
  }

  return rows;
}

export function buildSinkRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>
): NodePropertyRow[] {
  if (node.kind !== 'dvt:sink') {
    return [];
  }

  const config = asRecord(metadata.config);
  const database = readFirstString(config.database, metadata.database);
  const schema = readFirstString(config.schema, metadata.schema);
  const table = readFirstString(config.table, metadata.tableName);
  const rows: NodePropertyRow[] = [];

  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.destination,
    'Destination',
    [database, schema, table]
      .flatMap((part): readonly string[] => {
        const value = readString(part);
        return value == null ? [] : [value];
      })
      .join('.')
  );
  addRow(rows, NODE_PROPERTY_ROW_ID.database, 'Database', database);
  addRow(rows, NODE_PROPERTY_ROW_ID.schema, 'Schema', schema);
  addRow(rows, NODE_PROPERTY_ROW_ID.table, 'Table', table);
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.materialization,
    'Materialization',
    readFirstString(config.materialization, config.materialized, metadata.materialization)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.writeMode,
    'Write mode',
    readFirstString(config.writeMode, metadata.writeMode)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.partitionStrategy,
    'Partition strategy',
    readFirstString(config.partitionStrategy, metadata.partitionStrategy)
  );

  return rows;
}

export function buildCommentRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>
): NodePropertyRow[] {
  const rows: NodePropertyRow[] = [];
  addRow(rows, NODE_PROPERTY_ROW_ID.description, 'Description', node.description);
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.comment,
    'Comment',
    readFirstString(metadata.comment, metadata.comments)
  );
  return rows;
}
