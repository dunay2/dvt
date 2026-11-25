/** Materialize real SQL references while preserving their captured provenance. */
import type {
  ConnectionRef,
  RelationalSourceObjectLocator,
  TransformSqlProjectionResponse,
  SourceObject,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import {
  TransformSqlProjectionRequestSchema,
  readWorkspaceDbtModelReference,
} from '@dvt/contracts';
import type { ICanvasTransformSqlQueryPort } from '../../ports/canvasTransformSql';
import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasPhysicalCompositionInput } from '../canvas/canvasPhysicalCompositionInput';
import { readDvtTransformAuthoringAuthority } from '../canvas/canvasDvtTransformAuthoringAuthority';
import type { SqlWorksheetConnection, SqlWorksheetInsertion } from './sqlWorksheet.types';

export type SqlWorksheetModelTarget = Readonly<{
  connectionRef: ConnectionRef;
  canvasId: string;
  nodeId: string;
  semanticPlanSha256: string;
}>;

function sameSqlConnection(left: ConnectionRef | null | undefined, right: ConnectionRef): boolean {
  return left?.connectionId === right.connectionId && left.provider === right.provider;
}

function assertSqlModelProjection(
  target: SqlWorksheetModelTarget,
  projection: TransformSqlProjectionResponse
): void {
  const identities = [
    [projection.canvasId, target.canvasId],
    [projection.transformNodeId, target.nodeId],
    [projection.semanticPlanSha256, target.semanticPlanSha256],
  ];
  if (identities.some(([actual, expected]) => actual !== expected))
    throw new Error('The Model SQL identity changed.');
  if (
    projection.provenance.sourceRefs.some(
      ({ connectionRef }) => !sameSqlConnection(connectionRef, target.connectionRef)
    )
  )
    throw new Error('The Model uses another connection.');
}

export function quoteSqlWorksheetIdentifier(value: string): string {
  if (value.trim().length === 0 || value.includes('\u0000')) {
    throw new Error('A current SQL identifier is required.');
  }
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildSqlWorksheetTableInsertion(
  connectionRef: ConnectionRef,
  locator: RelationalSourceObjectLocator
): Extract<SqlWorksheetInsertion, { kind: 'table' }> {
  return {
    kind: 'table',
    connectionRef,
    schema: locator.schema,
    name: locator.name,
    fragment: `${quoteSqlWorksheetIdentifier(locator.schema)}.${quoteSqlWorksheetIdentifier(locator.name)}`,
  };
}

export function resolveSqlWorksheetObject(
  objects: readonly SourceObject[],
  objectId: string,
  connection: SqlWorksheetConnection
): SqlWorksheetInsertion {
  const object = objects.find((item) => item.objectId === objectId);
  if (object?.locator.kind !== 'relation')
    throw new Error('The database object is no longer available.');
  const connectionRef: ConnectionRef = {
    schemaVersion: 'connection-ref.v1',
    connectionId: connection.id,
    provider: connection.type,
  };
  return buildSqlWorksheetTableInsertion(connectionRef, object.locator);
}

export function buildSqlWorksheetModelInsertion(
  target: SqlWorksheetModelTarget,
  projection: TransformSqlProjectionResponse
): Extract<SqlWorksheetInsertion, { kind: 'model' }> {
  assertSqlModelProjection(target, projection);
  const sql = projection.sql.trim().replace(/;$/u, '');
  if (!sql) throw new Error('A materialized Model SQL projection is required.');
  const alias = `model_${sha256HexUtf8(JSON.stringify([target.canvasId, target.nodeId])).slice(0, 16)}`;
  return {
    kind: 'model',
    ...target,
    alias,
    fragment: `(\n${sql}\n) AS ${quoteSqlWorksheetIdentifier(alias)}`,
  };
}

export function retainSqlWorksheetInsertions(
  sql: string,
  insertions: readonly SqlWorksheetInsertion[]
): readonly SqlWorksheetInsertion[] {
  return insertions.filter(({ fragment }) => fragment.length > 0 && sql.includes(fragment));
}

/** Read actual publication SQL; a catalogue label is never a physical binding. */
export async function materializeSqlWorksheetNode(
  node: CanonicalNode,
  canvasId: string,
  connection: SqlWorksheetConnection,
  query: ICanvasTransformSqlQueryPort
): Promise<SqlWorksheetInsertion> {
  const connectionRef: ConnectionRef = {
    schemaVersion: 'connection-ref.v1',
    connectionId: connection.id,
    provider: connection.type,
  };
  const source = readSqlWorksheetSource(node, connectionRef, connection.database);
  if (source != null) return source;
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) throw new Error('A published Model SQL document is required.');
  const request = TransformSqlProjectionRequestSchema.parse({
    canvasId,
    transformNodeId: node.id,
    semanticPlanSha256: authority.semanticDocument.semanticPlan.sha256,
    presentation: 'readable',
  });
  const projection = await query.projectTransformSql(request);
  if (projection.provenance.sourceRefs.length === 0)
    assertSourceLessModelConnection(node, connectionRef);
  return buildSqlWorksheetModelInsertion(
    { connectionRef, canvasId, nodeId: node.id, semanticPlanSha256: request.semanticPlanSha256 },
    projection
  );
}

function assertSourceLessModelConnection(node: CanonicalNode, connectionRef: ConnectionRef): void {
  if (!sameSqlConnection(readWorkspaceDbtModelReference(node)?.connectionRef, connectionRef))
    throw new Error('The Model connection is unavailable.');
}

function readSqlWorksheetSource(
  node: CanonicalNode,
  connectionRef: ConnectionRef,
  catalog: string
): SqlWorksheetInsertion | null {
  const physical = resolveCanvasPhysicalCompositionInput(node, {
    sourceId: node.id,
    targetId: node.id,
  });
  if (physical == null) return null;
  if (!sameSqlConnection(physical.sourceRef?.connectionRef, connectionRef))
    throw new Error('Different Source connection.');
  return buildSqlWorksheetTableInsertion(connectionRef, {
    kind: 'relation',
    catalog,
    schema: physical.schema,
    name: physical.table,
    relationType: 'table',
  });
}
