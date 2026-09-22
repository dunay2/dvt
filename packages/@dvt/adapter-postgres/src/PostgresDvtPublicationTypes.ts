/**
 * Owned concern: define the stable PostgreSQL publication port and failure vocabulary.
 * @baseline ADR-0003: Execution Model
 * @decision Keep provider publication inputs and outcomes outside Engine contracts.
 * @consequence Runtime plugins depend on one bounded PostgreSQL capability.
 * @version 1.0.0
 */
import type { DvtTransformResultTargetV1 } from '@dvt/contracts';

export const POSTGRES_DVT_PUBLICATION_ERROR_CODE = {
  stale: 'STALE_PUBLICATION',
  unmanaged: 'UNMANAGED_PUBLICATION_TARGET',
  schemaMismatch: 'PUBLICATION_SCHEMA_MISMATCH',
  permissionDenied: 'PUBLICATION_PERMISSION_DENIED',
} as const;

export type PostgresDvtPublicationErrorCode =
  (typeof POSTGRES_DVT_PUBLICATION_ERROR_CODE)[keyof typeof POSTGRES_DVT_PUBLICATION_ERROR_CODE];

export class PostgresDvtPublicationRejectedError extends Error {
  public constructor(readonly code: PostgresDvtPublicationErrorCode) {
    super(code);
    this.name = 'PostgresDvtPublicationRejectedError';
  }
}

export interface PostgresDvtStableTablePublishInput {
  readonly sql: string;
  readonly target: DvtTransformResultTargetV1;
  readonly expectedSchemaDigestSha256: string;
  readonly publicationToken: string;
  readonly expectedPredecessorToken: string | null;
  readonly signal?: globalThis.AbortSignal;
}

export interface PostgresDvtStableTablePublishResult {
  readonly targetSchema: string;
  readonly targetRelation: string;
  readonly rowsWritten: number;
  readonly publicationToken: string;
  readonly predecessorToken: string | null;
  readonly publicationOutcome: 'created' | 'replaced' | 'verified-existing';
}
