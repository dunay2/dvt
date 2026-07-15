/** Owned concern: compose protected warehouse source import routes with adapters. */
import type { FastifyInstance } from 'fastify';

import { CreateWarehouseConnectionUseCase } from '../../application/services/createWarehouseConnectionUseCase.js';
import { DbtProjectFilesWarehouseSourceImportStrategy } from '../../application/services/dbtProjectFilesWarehouseSourceImportStrategy.js';
import { GraphDraftWarehouseSourceImportStrategy } from '../../application/services/graphDraftWarehouseSourceImportStrategy.js';
import { ImportWarehouseSourcesUseCase } from '../../application/services/importWarehouseSourcesUseCase.js';
import { ListWarehouseConnectionSourceObjectsUseCase } from '../../application/services/listWarehouseConnectionSourceObjectsUseCase.js';
import { ListWarehouseConnectionsUseCase } from '../../application/services/listWarehouseConnectionsUseCase.js';
import { TestWarehouseConnectionUseCase } from '../../application/services/testWarehouseConnectionUseCase.js';
import { WarehouseConnectionSourceObjectReader } from '../../application/services/WarehouseConnectionSourceObjectReader.js';
import { WorkspaceWarehouseConnectionCatalog } from '../../infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';
import {
  EnvironmentWarehouseCredentialResolver,
  WorkspaceWarehouseConnectionProbe,
} from '../../infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
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
  const workspaceFilesRoot = resolveWorkspaceFilesRoot(options.env);
  const workspaceFiles = new LocalWorkspaceFileRepository({
    root: workspaceFilesRoot,
  });
  const batchMutation = new LocalWorkspaceFileBatchMutationGateway({ root: workspaceFilesRoot });
  const catalog = new WorkspaceWarehouseConnectionCatalog({ repository: workspaceFiles });
  const probe = new WorkspaceWarehouseConnectionProbe({
    credentialResolver: new EnvironmentWarehouseCredentialResolver(),
    now: () => new Date(),
  });
  const sourceObjectReader = new WarehouseConnectionSourceObjectReader(catalog, probe);
  registerWarehouseSourceImportRoutes(app, {
    ...options.runtimeAuth,
    listConnectionsUseCase: new ListWarehouseConnectionsUseCase(catalog),
    listSourceObjectsUseCase: new ListWarehouseConnectionSourceObjectsUseCase(sourceObjectReader),
    createConnectionUseCase: new CreateWarehouseConnectionUseCase(catalog, probe),
    testConnectionUseCase: new TestWarehouseConnectionUseCase(catalog, probe),
    importSourcesUseCase: new ImportWarehouseSourcesUseCase({
      sourceObjectReader,
      authorityPolicy: options.protectedModule.canvasAuthoringAuthorityPolicy,
      graphDraftStrategy: new GraphDraftWarehouseSourceImportStrategy({
        draftStore: options.protectedModule.workspaceGraphDraftStore,
        workspaceFiles,
        batchMutation,
        now: () => new Date(),
      }),
      dbtProjectFilesStrategy: new DbtProjectFilesWarehouseSourceImportStrategy({
        workspaceFiles,
        batchMutation,
        projectGraph: options.protectedModule.dbtProjectImport.projectGraphUseCase,
      }),
    }),
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
