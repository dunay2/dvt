/**
 * Owned concern: publish one verified DVT projection into one stable PostgreSQL table.
 * @baseline ADR-0003: Execution Model
 * @decision Build a candidate before a target-scoped CAS transaction and preserve the target object.
 * @consequence Late runs, unmanaged collisions and schema drift fail without replacing the table.
 * @version 1.0.0
 */
import { createDvtPostgresOutputSchemaDigestV1 } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { renderPostgresDvtPublicationMarker } from './PostgresDvtPublicationMarker.js';
import {
  derivePostgresDvtAdvisoryKeys,
  readPostgresDvtCandidateSchema,
  readPostgresDvtTargetMetadata,
  validatePostgresDvtTarget,
  type PostgresDvtTargetMetadata,
} from './PostgresDvtPublicationMetadata.js';
import {
  ACQUIRE_PUBLICATION_LOCK_SQL,
  CURRENT_DATABASE_SQL,
  commentTargetSql,
  countCandidateSql,
  countRelationSql,
  createCandidateSql,
  createTargetSql,
  deleteTargetSql,
  insertTargetSql,
  lockTargetSql,
} from './PostgresDvtPublicationSql.js';
import {
  POSTGRES_DVT_PUBLICATION_ERROR_CODE,
  PostgresDvtPublicationRejectedError,
  type PostgresDvtStableTablePublishInput,
  type PostgresDvtStableTablePublishResult,
} from './PostgresDvtPublicationTypes.js';

export class PostgresDvtStableTablePublisher {
  public constructor(private readonly session: PostgresAdapterClientSession) {}

  public async publish(
    input: PostgresDvtStableTablePublishInput
  ): Promise<PostgresDvtStableTablePublishResult> {
    assertInput(input);
    try {
      return await this.session.withTransaction((client) =>
        this.publishInTransaction(client, input)
      );
    } catch (error) {
      if (isPostgresPermissionError(error)) {
        throw new PostgresDvtPublicationRejectedError(
          POSTGRES_DVT_PUBLICATION_ERROR_CODE.permissionDenied
        );
      }
      throw error;
    }
  }

  private async publishInTransaction(
    client: PoolClient,
    input: PostgresDvtStableTablePublishInput
  ): Promise<PostgresDvtStableTablePublishResult> {
    assertNotAborted(input.signal);
    const candidate = `dvt_candidate_${input.publicationToken.slice(0, 16)}`;
    await client.query(createCandidateSql(candidate, input.sql));
    const candidateSchema = await readPostgresDvtCandidateSchema(client, candidate);
    const candidateDigest = createDvtPostgresOutputSchemaDigestV1(candidateSchema);
    if (candidateDigest !== input.expectedSchemaDigestSha256) reject('schemaMismatch');
    const rowsWritten = await countRows(client, countCandidateSql(candidate));
    assertNotAborted(input.signal);

    const databaseResult = await client.query<{ readonly database: string }>(CURRENT_DATABASE_SQL);
    const database = databaseResult.rows[0]?.database;
    if (database === undefined) throw new Error('POSTGRES_DATABASE_IDENTITY_UNAVAILABLE');
    const [key1, key2] = derivePostgresDvtAdvisoryKeys(
      database,
      input.target.schema,
      input.target.relation
    );
    await client.query(ACQUIRE_PUBLICATION_LOCK_SQL, [key1, key2]);

    let target = await readPostgresDvtTargetMetadata(
      client,
      input.target.schema,
      input.target.relation
    );
    if (target !== null) {
      if (target.relationKind !== 'r') reject('unmanaged');
      await client.query(lockTargetSql(input.target.schema, input.target.relation));
      target = await readPostgresDvtTargetMetadata(
        client,
        input.target.schema,
        input.target.relation
      );
    }
    return this.publishCandidate(
      client,
      input,
      candidate,
      candidateSchema.columns,
      rowsWritten,
      target
    );
  }

  private async publishCandidate(
    client: PoolClient,
    input: PostgresDvtStableTablePublishInput,
    candidate: string,
    columns: readonly { readonly name: string }[],
    rowsWritten: number,
    target: PostgresDvtTargetMetadata | null
  ): Promise<PostgresDvtStableTablePublishResult> {
    const currentMarker = await validatePostgresDvtTarget(client, target, {
      schema: input.target.schema,
      relation: input.target.relation,
      schemaDigestSha256: input.expectedSchemaDigestSha256,
    });
    if (currentMarker?.token === input.publicationToken) {
      return result(
        input,
        await countRows(client, countRelationSql(input.target.schema, input.target.relation)),
        currentMarker.token,
        'verified-existing'
      );
    }
    if ((currentMarker?.token ?? null) !== input.expectedPredecessorToken) reject('stale');

    const outcome = target === null ? 'created' : 'replaced';
    if (target === null) {
      await client.query(createTargetSql(input.target.schema, input.target.relation, candidate));
    } else {
      await client.query(deleteTargetSql(input.target.schema, input.target.relation));
    }
    await client.query(
      insertTargetSql(
        input.target.schema,
        input.target.relation,
        candidate,
        columns.map((column) => column.name)
      )
    );
    await client.query(
      commentTargetSql(
        input.target.schema,
        input.target.relation,
        renderPostgresDvtPublicationMarker({
          token: input.publicationToken,
          schemaDigestSha256: input.expectedSchemaDigestSha256,
        })
      )
    );
    return result(input, rowsWritten, currentMarker?.token ?? null, outcome);
  }
}

function result(
  input: PostgresDvtStableTablePublishInput,
  rowsWritten: number,
  predecessorToken: string | null,
  publicationOutcome: PostgresDvtStableTablePublishResult['publicationOutcome']
): PostgresDvtStableTablePublishResult {
  return {
    targetSchema: input.target.schema,
    targetRelation: input.target.relation,
    rowsWritten,
    publicationToken: input.publicationToken,
    predecessorToken,
    publicationOutcome,
  };
}

async function countRows(client: PoolClient, sql: string): Promise<number> {
  const count = Number((await client.query<{ readonly count: string }>(sql)).rows[0]?.count);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('POSTGRES_ROW_COUNT_INVALID');
  return count;
}

function reject(key: keyof typeof POSTGRES_DVT_PUBLICATION_ERROR_CODE): never {
  throw new PostgresDvtPublicationRejectedError(POSTGRES_DVT_PUBLICATION_ERROR_CODE[key]);
}

function assertInput(input: PostgresDvtStableTablePublishInput): void {
  if (input.sql.trim().length === 0) throw new Error('DVT_PROJECTION_SQL_EMPTY');
  for (const digest of [input.expectedSchemaDigestSha256, input.publicationToken]) {
    if (!/^[0-9a-f]{64}$/u.test(digest)) throw new Error('DVT_PUBLICATION_IDENTITY_INVALID');
  }
  if (
    input.expectedPredecessorToken !== null &&
    !/^[0-9a-f]{64}$/u.test(input.expectedPredecessorToken)
  ) {
    throw new Error('DVT_PUBLICATION_IDENTITY_INVALID');
  }
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) throw signal.reason ?? new Error('DVT publication cancelled.');
}

function isPostgresPermissionError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '42501';
}
