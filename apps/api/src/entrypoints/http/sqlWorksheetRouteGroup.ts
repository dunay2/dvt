/** Compose independent SQL execution and persistent history with the protected runtime adapters. */
import { performance } from 'node:perf_hooks';

import { randomUuidV4 } from '@dvt/crypto';
import type { FastifyInstance } from 'fastify';

import { ExecuteWorkspaceSqlCommand } from '../../application/services/sqlWorksheet/ExecuteWorkspaceSqlCommand.js';
import { GetWorkspaceSqlExecutionQuery } from '../../application/services/sqlWorksheet/GetWorkspaceSqlExecutionQuery.js';
import { ListWorkspaceSqlExecutionsQuery } from '../../application/services/sqlWorksheet/ListWorkspaceSqlExecutionsQuery.js';
import { LocalWorkspaceSqlExecutionHistoryRepository } from '../../infrastructure/sqlWorksheet/LocalWorkspaceSqlExecutionHistoryRepository.js';
import { PostgresWorkspaceSqlExecutor } from '../../infrastructure/sqlWorksheet/PostgresWorkspaceSqlExecutor.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';

import type { RuntimeAuth } from './protectedRuntimeRouteDependencies.js';
import { registerSqlWorksheetRoutes } from './sqlWorksheetRoutes.js';

export function registerSqlWorksheetRouteGroup(
  app: FastifyInstance,
  options: Readonly<{
    protectedModule: ProtectedRuntimeModule;
    runtimeAuth: RuntimeAuth;
    rateLimit: Readonly<{ max: number; timeWindow: number }>;
  }>
): void {
  const { protectedModule } = options;
  const history = new LocalWorkspaceSqlExecutionHistoryRepository({
    root: protectedModule.workspaceFilesRoot,
  });
  registerSqlWorksheetRoutes(app, {
    ...options.runtimeAuth,
    rateLimit: options.rateLimit,
    executeCommand: new ExecuteWorkspaceSqlCommand({
      catalog: protectedModule.warehouseConnectionCatalog,
      executor: new PostgresWorkspaceSqlExecutor({
        credentialResolver: protectedModule.postgresCredentialResolver,
      }),
      history,
      now: () => new Date(),
      elapsedNow: () => performance.now(),
      nonce: randomUuidV4,
    }),
    listQuery: new ListWorkspaceSqlExecutionsQuery(history),
    getQuery: new GetWorkspaceSqlExecutionQuery(history),
  });
}
