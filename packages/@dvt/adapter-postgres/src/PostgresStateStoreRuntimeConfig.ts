import type { Pool } from 'pg';

import type {
  RunEventReadRepository,
  RunEventRepositoryDeps,
  RunEventWriteRepository,
} from './RunEventWriteRepository.js';

export interface PostgresStateStoreRuntimeConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  now?: () => string;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  assumeSchemaReady?: boolean;
  outboxShardCount?: number;
  outboxClaimTimeoutMs?: number;
  lineageOutboxClaimTimeoutMs?: number;
  runEventRepositoryFactory?: (
    deps: RunEventRepositoryDeps
  ) => RunEventWriteRepository & RunEventReadRepository;
}
