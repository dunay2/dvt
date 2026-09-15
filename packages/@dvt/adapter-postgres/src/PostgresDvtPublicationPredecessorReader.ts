/**
 * Owned concern: observe the immutable predecessor marker for one DVT publication admission.
 * @baseline ADR-0003: Execution Model
 * @decision Resolve governed credentials and read only the exact PostgreSQL target marker.
 * @consequence StartRun freezes compare-and-swap intent without exposing credential values.
 * @version 1.0.0
 */
import type { DvtTransformResultTargetV1 } from '@dvt/contracts';
import { Pool, type QueryResult } from 'pg';

import type { IPostgresCredentialBindingResolver } from './PostgresCredentialBindingResolver.js';

const MARKER_PATTERN = /^dvt:publication:v1;token=([0-9a-f]{64});schema=([0-9a-f]{64})$/u;

export type DvtPublicationPredecessorObservation =
  | { readonly ok: true; readonly predecessorToken: string | null }
  | {
      readonly ok: false;
      readonly reason: 'credential_unavailable' | 'unmanaged_target' | 'schema_mismatch';
    };

export interface PostgresDvtPublicationPredecessorReaderConfig {
  readonly credentialResolver: IPostgresCredentialBindingResolver;
  readonly poolFactory?: (connectionString: string) => Pick<Pool, 'query' | 'end'>;
}

export class PostgresDvtPublicationPredecessorReader {
  private readonly poolFactory: NonNullable<
    PostgresDvtPublicationPredecessorReaderConfig['poolFactory']
  >;

  public constructor(private readonly config: PostgresDvtPublicationPredecessorReaderConfig) {
    this.poolFactory = config.poolFactory ?? ((connectionString) => new Pool({ connectionString }));
  }

  public async observe(input: {
    readonly credentialRef: string;
    readonly target: DvtTransformResultTargetV1;
    readonly schemaDigestSha256: string;
  }): Promise<DvtPublicationPredecessorObservation> {
    const connectionString = await this.config.credentialResolver.resolveCredential(
      input.credentialRef
    );
    if (connectionString === null) return { ok: false, reason: 'credential_unavailable' };

    const pool = this.poolFactory(connectionString);
    try {
      const result = await pool.query<TargetMarkerRow>(TARGET_MARKER_SQL, [
        input.target.schema,
        input.target.relation,
      ]);
      return toObservation(result, input.schemaDigestSha256);
    } finally {
      await pool.end();
    }
  }
}

type TargetMarkerRow = {
  readonly relationKind: string;
  readonly ownedByCurrentRole: boolean;
  readonly marker: string | null;
};

const TARGET_MARKER_SQL = `
SELECT
  c.relkind AS "relationKind",
  c.relowner = (SELECT usesysid FROM pg_user WHERE usename = current_user) AS "ownedByCurrentRole",
  obj_description(c.oid, 'pg_class') AS marker
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = $1 AND c.relname = $2
`;

function toObservation(
  result: QueryResult<TargetMarkerRow>,
  expectedSchemaDigest: string
): DvtPublicationPredecessorObservation {
  const row = result.rows[0];
  if (row === undefined) return { ok: true, predecessorToken: null };
  if (row.relationKind !== 'r' || !row.ownedByCurrentRole || row.marker === null) {
    return { ok: false, reason: 'unmanaged_target' };
  }
  const marker = MARKER_PATTERN.exec(row.marker);
  if (marker === null) return { ok: false, reason: 'unmanaged_target' };
  if (marker[2] !== expectedSchemaDigest) return { ok: false, reason: 'schema_mismatch' };
  return { ok: true, predecessorToken: marker[1] ?? null };
}
