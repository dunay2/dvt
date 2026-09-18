/** Owned concern: execute server-owned Transform SQL as one bounded, read-only PostgreSQL sample. */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import { TRANSFORM_DATA_SAMPLE_MAX_LIMIT } from '@dvt/contracts';
import { Client } from 'pg';

import type {
  CanvasTransformDataSampleProbeInput,
  CanvasTransformDataSampleProbeResult,
  ICanvasTransformDataSampleProbe,
} from '../../application/ports/canvasTransformDataSample.js';
import { CanvasTransformDataSampleUnavailableError } from '../../application/ports/canvasTransformDataSample.js';

import {
  postgresTypeNameFromDataTypeId,
  serializePostgresSampleCell,
} from './postgresDataSampleSerialization.js';

type PostgresSampleClient = Pick<Client, 'connect' | 'query' | 'end'>;

const TRANSFORM_DATA_SAMPLE_TIMEOUT_MS = 3000;

export class PostgresCanvasTransformDataSampleProbe implements ICanvasTransformDataSampleProbe {
  public constructor(
    private readonly options: {
      readonly credentialResolver: IPostgresCredentialBindingResolver;
      readonly now: () => Date;
      readonly createClient?: (connectionString: string) => PostgresSampleClient;
    }
  ) {}

  public async previewTransformRows(
    input: CanvasTransformDataSampleProbeInput
  ): Promise<CanvasTransformDataSampleProbeResult> {
    if (
      input.type !== 'postgres' ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > TRANSFORM_DATA_SAMPLE_MAX_LIMIT
    ) {
      throw new CanvasTransformDataSampleUnavailableError('connection_mismatch');
    }
    const connectionString = await this.options.credentialResolver.resolveCredential(
      input.credentialRef
    );
    if (connectionString === null || connectionString.trim().length === 0) {
      throw new CanvasTransformDataSampleUnavailableError('connection_mismatch');
    }

    const createClient =
      this.options.createClient ?? ((value: string) => new Client({ connectionString: value }));
    const client = createClient(connectionString);
    let transactionStarted = false;
    try {
      await client.connect();
      await client.query('begin transaction isolation level repeatable read read only');
      transactionStarted = true;
      await client.query(`set local statement_timeout = '${TRANSFORM_DATA_SAMPLE_TIMEOUT_MS}ms'`);
      const result = await client.query<Readonly<Record<string, unknown>>>(
        `select * from (\n${withoutTrailingSemicolon(input.sql)}\n) as dvt_transform_preview limit ${input.limit + 1}`
      );
      const fields = result.fields ?? [];
      const truncated = result.rows.length > input.limit;
      const rows = result.rows.slice(0, input.limit).map((row) => ({
        values: fields.map((field) => serializePostgresSampleCell(row[field.name])),
      }));
      await client.query('commit');
      transactionStarted = false;
      return {
        columns: fields.map((field) => ({
          name: field.name,
          type: postgresTypeNameFromDataTypeId(field.dataTypeID),
          nullable: true,
        })),
        rows,
        truncated,
        sampledAt: this.options.now().toISOString(),
      };
    } catch (error) {
      if (transactionStarted) {
        await client.query('rollback').catch(() => undefined);
      }
      if (error instanceof CanvasTransformDataSampleUnavailableError) throw error;
      throw new CanvasTransformDataSampleUnavailableError('query_failed');
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}

function withoutTrailingSemicolon(sql: string): string {
  return sql.trim().replace(/;\s*$/, '');
}
