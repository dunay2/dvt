/**
 * Owned concern: bind a Run publication sample to immutable evidence and authorized scope.
 * @baseline ADR-0066: A stable publication table is not historical row storage.
 * @decision Reuse the connection catalog, relational identity codec and token-bound query.
 * @consequence No Canvas state, guessed database, alternate query or result store is authoritative.
 * @version 1.0.0
 */
import {
  buildRelationalSourceObjectId,
  SOURCE_DATA_SAMPLE_DEFAULT_LIMIT,
  type DvtPostgresPublicationEvidence,
} from '@dvt/contracts';
import type { RunSnapshot } from '../../ports/runs';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type {
  IWarehouseSourceImportPort,
  IWarehouseSourceDataSampleQueryPort,
  SourceDataSample,
} from '../../ports/workspace';
import { classifyHttpError } from '../api/classifyHttpError';
import {
  WarehouseSourceDataSampleQueryError,
  type WarehouseSourceDataSampleQueryErrorReason,
} from '../workspace/workspaceErrors';

export type RunPublicationSampleFailure =
  WarehouseSourceDataSampleQueryErrorReason | 'auth-required' | 'access-denied';
export type RunPublicationSampleState =
  | { readonly kind: 'idle' | 'loading' | 'unavailable' }
  | { readonly kind: 'error'; readonly reason: RunPublicationSampleFailure }
  | { readonly kind: 'ready'; readonly sample: SourceDataSample };
export type RunPublicationSamplePorts = Readonly<{
  connections: Pick<IWarehouseSourceImportPort, 'listWarehouseConnections'>;
  samples: IWarehouseSourceDataSampleQueryPort;
}>;

export function runPublicationSampleIdentity(
  snapshot: RunSnapshot,
  scope: WorkspaceScope
): string | null {
  const evidence = snapshot.publication;
  if (snapshot.status !== 'completed' || evidence == null) return null;
  if (
    snapshot.tenantId !== scope.tenantId ||
    snapshot.projectId !== scope.projectId ||
    snapshot.environment !== scope.environmentId ||
    evidence.environmentId !== scope.environmentId
  )
    return null;
  return JSON.stringify([
    scope.tenantId,
    scope.projectId,
    scope.environmentId,
    snapshot.runId,
    snapshot.logicalAttemptId,
    evidence,
  ]);
}

export async function loadRunPublicationSample(
  evidence: DvtPostgresPublicationEvidence,
  ports: RunPublicationSamplePorts,
  isCurrent: () => boolean
): Promise<SourceDataSample | null> {
  if (!isCurrent()) return null;
  const connections = await ports.connections.listWarehouseConnections();
  if (!isCurrent()) return null;
  const { target } = evidence;
  const connection = connections.find((item) => item.id === target.connectionRef.connectionId);
  if (connection == null) throw new WarehouseSourceDataSampleQueryError('connection_not_found');
  if (connection.type !== target.connectionRef.provider)
    throw new WarehouseSourceDataSampleQueryError('unavailable');
  const objectId = buildRelationalSourceObjectId({
    kind: 'relation',
    relationType: 'table',
    catalog: connection.database,
    schema: target.schema,
    name: target.relation,
  });
  const sample = await ports.samples.previewSourceObjectRows({
    connectionId: connection.id,
    objectId,
    expectedPublicationToken: evidence.publication.token,
    limit: SOURCE_DATA_SAMPLE_DEFAULT_LIMIT,
  });
  if (sample.connectionId !== connection.id || sample.objectId !== objectId) {
    throw new WarehouseSourceDataSampleQueryError('unavailable');
  }
  return sample;
}

export function classifyRunPublicationSampleFailure(error: unknown): RunPublicationSampleFailure {
  if (error instanceof WarehouseSourceDataSampleQueryError) return error.reason;
  const kind = classifyHttpError(error);
  return kind === 'auth-required' || kind === 'access-denied' ? kind : 'unavailable';
}
