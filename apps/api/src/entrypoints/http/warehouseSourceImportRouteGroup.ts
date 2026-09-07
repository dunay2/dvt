/** Owned concern: compose protected warehouse source import routes with adapters. */
import type { FastifyInstance } from 'fastify';

import { CreateWarehouseConnectionUseCase } from '../../application/services/createWarehouseConnectionUseCase.js';
import { DbtProjectFilesWarehouseSourceImportStrategy } from '../../application/services/dbtProjectFilesWarehouseSourceImportStrategy.js';
import { GraphDraftWarehouseSourceImportStrategy } from '../../application/services/graphDraftWarehouseSourceImportStrategy.js';
import { ImportWarehouseSourcesUseCase } from '../../application/services/importWarehouseSourcesUseCase.js';
import { ListWarehouseConnectionSourceObjectsUseCase } from '../../application/services/listWarehouseConnectionSourceObjectsUseCase.js';
import { ListWarehouseConnectionsUseCase } from '../../application/services/listWarehouseConnectionsUseCase.js';
import { RebindWarehouseSourceUseCase } from '../../application/services/rebindWarehouseSourceUseCase.js';
import { RenameWarehouseConnectionUseCase } from '../../application/services/renameWarehouseConnectionUseCase.js';
import { TestWarehouseConnectionUseCase } from '../../application/services/testWarehouseConnectionUseCase.js';
import { WarehouseConnectionSourceObjectReader } from '../../application/services/WarehouseConnectionSourceObjectReader.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import { LocalWorkspaceFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import type { RuntimeAuth } from './protectedRuntimeRouteDependencies.js';
import type { ProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { registerWarehouseSourceImportRoutes } from './warehouseSourceImportRoutes.js';
import { registerWarehouseSourceRebindRoute } from './warehouseSourceRebindRoute.js';

export type ProtectedWarehouseSourceImportRouteGroupOptions = {
  readonly env: Env;
  readonly runtimeAuth: RuntimeAuth;
  readonly protectedModule: ProtectedRuntimeModule;
  readonly connectionProbe: ProtectedRuntimeRouteDependencies['warehouseConnectionProbe'];
  readonly previewSourceRowsUseCase: ProtectedRuntimeRouteDependencies['previewWarehouseSourceObjectRowsUseCase'];
  readonly validatePostgresTransformSqlUseCase: ProtectedRuntimeRouteDependencies['validatePostgresTransformSqlUseCase'];
};

export function registerProtectedWarehouseSourceImportRouteGroup(
  app: FastifyInstance,
  options: ProtectedWarehouseSourceImportRouteGroupOptions
): void {
  const workspaceFilesRoot = options.protectedModule.workspaceFilesRoot;
  const workspaceFiles = new LocalWorkspaceFileRepository({
    root: workspaceFilesRoot,
  });
  const batchMutation = new LocalWorkspaceFileBatchMutationGateway({ root: workspaceFilesRoot });
  const catalog = options.protectedModule.warehouseConnectionCatalog;
  const probe = options.connectionProbe;
  const sourceObjectReader = new WarehouseConnectionSourceObjectReader(catalog, probe);
  const rateLimit = {
    max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  };
  registerWarehouseSourceImportRoutes(app, {
    ...options.runtimeAuth,
    listConnectionsUseCase: new ListWarehouseConnectionsUseCase(catalog),
    listSourceObjectsUseCase: new ListWarehouseConnectionSourceObjectsUseCase(sourceObjectReader),
    previewSourceRowsUseCase: options.previewSourceRowsUseCase,
    createConnectionUseCase: new CreateWarehouseConnectionUseCase(catalog, probe),
    renameConnectionUseCase: new RenameWarehouseConnectionUseCase(catalog),
    testConnectionUseCase: new TestWarehouseConnectionUseCase(catalog, probe),
    validatePostgresTransformSqlUseCase: options.validatePostgresTransformSqlUseCase,
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
    rateLimit,
  });
  registerWarehouseSourceRebindRoute(app, {
    ...options.runtimeAuth,
    rebindSourceUseCase: new RebindWarehouseSourceUseCase({
      draftStore: options.protectedModule.workspaceGraphDraftStore,
      sourceObjectReader,
      workspaceFiles,
      batchMutation,
      now: () => new Date(),
    }),
    rateLimit,
  });
}
