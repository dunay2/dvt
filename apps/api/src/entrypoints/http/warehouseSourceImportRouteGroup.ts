/** Owned concern: compose protected warehouse source import routes with adapters. */
import type { FastifyInstance } from 'fastify';

import { CreateWarehouseConnectionUseCase } from '../../application/services/createWarehouseConnectionUseCase.js';
import { ImportWarehouseSourcesUseCase } from '../../application/services/importWarehouseSourcesUseCase.js';
import { ListWarehouseConnectionsUseCase } from '../../application/services/listWarehouseConnectionsUseCase.js';
import { ListWarehouseConnectionTablesUseCase } from '../../application/services/listWarehouseConnectionTablesUseCase.js';
import { TestWarehouseConnectionUseCase } from '../../application/services/testWarehouseConnectionUseCase.js';
import { WorkspaceWarehouseConnectionCatalog } from '../../infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';
import {
  EnvironmentWarehouseCredentialResolver,
  WorkspaceWarehouseConnectionProbe,
} from '../../infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';
import { LocalWorkspaceFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import { resolveWorkspaceFilesRoot } from '../../infrastructure/workspaceFiles/resolveWorkspaceFilesRoot.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import type { RuntimeAuth } from './protectedRuntimeRouteDependencies.js';
import { registerWarehouseSourceImportRoutes } from './warehouseSourceImportRoutes.js';

export type ProtectedWarehouseSourceImportRouteGroupOptions = {
  readonly env: Env;
  readonly runtimeAuth: RuntimeAuth;
  readonly protectedModule: ProtectedRuntimeModule;
};

export function registerProtectedWarehouseSourceImportRouteGroup(
  app: FastifyInstance,
  options: ProtectedWarehouseSourceImportRouteGroupOptions
): void {
  const workspaceFiles = new LocalWorkspaceFileRepository({
    root: resolveWorkspaceFilesRoot(options.env),
  });
  const catalog = new WorkspaceWarehouseConnectionCatalog({ repository: workspaceFiles });
  const probe = new WorkspaceWarehouseConnectionProbe({
    credentialResolver: new EnvironmentWarehouseCredentialResolver(),
    now: () => new Date(),
  });
  registerWarehouseSourceImportRoutes(app, {
    ...options.runtimeAuth,
    listConnectionsUseCase: new ListWarehouseConnectionsUseCase(catalog),
    listTablesUseCase: new ListWarehouseConnectionTablesUseCase(catalog),
    createConnectionUseCase: new CreateWarehouseConnectionUseCase(catalog, probe),
    testConnectionUseCase: new TestWarehouseConnectionUseCase(catalog, probe),
    importSourcesUseCase: new ImportWarehouseSourcesUseCase(
      catalog,
      options.protectedModule.workspaceGraphDraftStore,
      workspaceFiles,
      () => new Date()
    ),
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
