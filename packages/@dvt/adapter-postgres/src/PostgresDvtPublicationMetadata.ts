/**
 * Owned concern: inspect and validate PostgreSQL publication metadata and schema identity.
 * @baseline ADR-0003: Execution Model
 * @decision Derive CAS lock keys and schema fingerprints from provider-native metadata.
 * @consequence Publication rejects ownership, ACL and metadata drift before target mutation.
 * @version 1.0.0
 */
import { createHash } from 'node:crypto';

import {
  DvtPostgresOutputSchemaV1Schema,
  createDvtPostgresOutputSchemaDigestV1,
  type DvtPostgresOutputSchemaV1,
} from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { parsePostgresDvtPublicationMarker } from './PostgresDvtPublicationMarker.js';
import {
  RELATION_COLUMNS_SQL,
  TARGET_METADATA_SQL,
  TEMP_RELATION_COLUMNS_SQL,
} from './PostgresDvtPublicationSql.js';
import {
  POSTGRES_DVT_PUBLICATION_ERROR_CODE,
  PostgresDvtPublicationRejectedError,
} from './PostgresDvtPublicationTypes.js';

export type PostgresDvtTargetMetadata = {
  readonly oid: string;
  readonly relationKind: string;
  readonly owner: string;
  readonly currentRole: string;
  readonly marker: string | null;
  readonly hasExternalWriteGrant: boolean;
  readonly hasMetadataDrift: boolean;
};

export async function readPostgresDvtTargetMetadata(
  client: PoolClient,
  schema: string,
  relation: string
): Promise<PostgresDvtTargetMetadata | null> {
  const result = await client.query<PostgresDvtTargetMetadata>(TARGET_METADATA_SQL, [
    schema,
    relation,
  ]);
  return result.rows[0] ?? null;
}

export async function readPostgresDvtCandidateSchema(
  client: PoolClient,
  candidate: string
): Promise<DvtPostgresOutputSchemaV1> {
  const result = await client.query<ColumnRow>(TEMP_RELATION_COLUMNS_SQL, [candidate]);
  return parseColumns(result.rows);
}

export async function readPostgresDvtTargetSchemaDigest(
  client: PoolClient,
  schema: string,
  relation: string
): Promise<string> {
  const result = await client.query<ColumnRow>(RELATION_COLUMNS_SQL, [schema, relation]);
  return createDvtPostgresOutputSchemaDigestV1(parseColumns(result.rows));
}

export async function validatePostgresDvtTarget(
  client: PoolClient,
  target: PostgresDvtTargetMetadata | null,
  input: { readonly schema: string; readonly relation: string; readonly schemaDigestSha256: string }
): Promise<ReturnType<typeof parsePostgresDvtPublicationMarker>> {
  if (target === null) return null;
  if (target.owner !== target.currentRole) reject('permissionDenied');
  if (target.hasExternalWriteGrant) reject('unmanaged');
  if (target.hasMetadataDrift) reject('schemaMismatch');
  const marker = parsePostgresDvtPublicationMarker(target.marker);
  if (marker === null) reject('unmanaged');
  const actualDigest = await readPostgresDvtTargetSchemaDigest(
    client,
    input.schema,
    input.relation
  );
  if (
    marker.schemaDigestSha256 !== input.schemaDigestSha256 ||
    actualDigest !== input.schemaDigestSha256
  ) {
    reject('schemaMismatch');
  }
  return marker;
}

export function derivePostgresDvtAdvisoryKeys(
  database: string,
  schema: string,
  relation: string
): readonly [number, number] {
  const digest = createHash('sha256').update(`${database}\0${schema}\0${relation}`).digest();
  return [digest.readInt32BE(0), digest.readInt32BE(4)];
}

type ColumnRow = {
  readonly ordinal: number;
  readonly name: string;
  readonly postgresType: string;
  readonly nullable: boolean;
  readonly defaultExpression: string | null;
  readonly generatedExpression: string | null;
  readonly collation: string | null;
};

function parseColumns(rows: readonly ColumnRow[]): DvtPostgresOutputSchemaV1 {
  return DvtPostgresOutputSchemaV1Schema.parse({
    schemaVersion: 'dvt-postgres-output-schema.v1',
    columns: rows,
    constraints: [],
    indexes: [],
  });
}

function reject(key: keyof typeof POSTGRES_DVT_PUBLICATION_ERROR_CODE): never {
  throw new PostgresDvtPublicationRejectedError(POSTGRES_DVT_PUBLICATION_ERROR_CODE[key]);
}
