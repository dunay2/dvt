/**
 * Owned concern: observe bounded PostgreSQL catalog evidence on the governed credential.
 * Reason: saved model signatures cannot attest physical schemas or operator resolution.
 * Corners: preserve effective search path, require the declared database, close every client.
 */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import { Client, type ClientConfig } from 'pg';

import type {
  IPostgresSqlPresentationEvidenceReader,
  PostgresSqlPresentationEvidence,
} from '../../application/ports/postgresSqlPresentationEvidence.js';

import { readPostgresSqlPresentationCatalog } from './postgresSqlPresentationCatalog.js';

type EvidenceClient = Pick<Client, 'connect' | 'query' | 'end'>;

export class PostgresSqlPresentationEvidenceReader implements IPostgresSqlPresentationEvidenceReader {
  constructor(
    private readonly options: Readonly<{
      credentialResolver: IPostgresCredentialBindingResolver;
      clientFactory?: (config: ClientConfig) => EvidenceClient;
    }>
  ) {}

  async read(
    input: Parameters<IPostgresSqlPresentationEvidenceReader['read']>[0]
  ): Promise<PostgresSqlPresentationEvidence | null> {
    if (
      input.relations.length > 128 ||
      input.relations.some(
        (relation) => relation.catalog !== undefined && relation.catalog !== input.database
      )
    )
      return null;
    let connectionString;
    try {
      connectionString = await this.options.credentialResolver.resolveCredential(
        input.credentialRef
      );
    } catch {
      return null;
    }
    if (!connectionString?.trim()) return null;
    const client = (this.options.clientFactory ?? ((config) => new Client(config)))({
      connectionString,
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
    });
    let transactionStarted = false;
    try {
      await client.connect();
      await client.query('begin transaction isolation level repeatable read read only');
      transactionStarted = true;
      await client.query("set local statement_timeout = '3000ms'");
      const identity = await client.query<{ database: string; search_path: string[] }>(
        'select pg_catalog.current_database() as database, pg_catalog.current_schemas(true)::text[] as search_path'
      );
      if (
        identity.rows.length !== 1 ||
        identity.rows[0]?.database !== input.database ||
        !Array.isArray(identity.rows[0].search_path)
      )
        return null;
      const originalPath = identity.rows[0].search_path;
      await client.query('set local search_path = pg_catalog');
      return await readPostgresSqlPresentationCatalog(client, {
        relations: input.relations,
        currentDatabase: identity.rows[0].database,
        originalPath,
      });
    } catch {
      return null;
    } finally {
      if (transactionStarted) await client.query('rollback').catch(() => undefined);
      await client.end().catch(() => undefined);
    }
  }
}
