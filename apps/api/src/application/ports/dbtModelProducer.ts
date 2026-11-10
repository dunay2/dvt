/** Resolve file-owned producer results inside an already authorized native Canvas selection. */
import type { ConnectionRef, WorkspaceGraphAuthoringNode } from '@dvt/contracts';
import type { SubstraitPostgresAstProjection } from '@dvt/postgres-projection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import type { AuthorizedExecutionContext } from './authContract.js';

export type DbtModelProducer = Readonly<{
  document: SubstraitDocument;
  connection: ConnectionRef;
  projection: SubstraitPostgresAstProjection;
  provenance: Readonly<{
    canvasId: string;
    uniqueId: string;
    contentSetSha256: string;
    analysisSha256: string;
  }>;
}>;
export interface IDbtModelProducerResolver {
  resolve(
    nodes: readonly WorkspaceGraphAuthoringNode[],
    context: AuthorizedExecutionContext
  ): Promise<ReadonlyMap<string, DbtModelProducer>>;
}

export class DbtModelProducerAccessDeniedError extends Error {
  public constructor() {
    super('Scoped file-model access is unavailable.');
    this.name = 'DbtModelProducerAccessDeniedError';
  }
}
