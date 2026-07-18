/** Owned concern: compose the protected dbt YAML description edit route group. */
import type { FastifyInstance } from 'fastify';

import { ApplyDbtYamlDescriptionEditCommand } from '../../application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.js';
import { DbtYamlDescriptionResourceResolver } from '../../application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.js';
import { ProposeDbtYamlDescriptionEditQuery } from '../../application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.js';
import { RevertDbtYamlDescriptionEditCommand } from '../../application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.js';
import { WorkspaceMetadataDbtYamlDescriptionReceiptStore } from '../../infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.js';
import { YamlCstDbtDescriptionMutator } from '../../infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import { LocalWorkspaceFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import { LocalWorkspaceMetadataFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerDbtYamlDescriptionEditRoutes } from './dbtYamlDescriptionEditRoutes.js';

export function registerProtectedDbtYamlDescriptionEditRouteGroup(
  app: FastifyInstance,
  options: Readonly<{
    env: Env;
    runtimeAuth: Pick<ProtectedRuntimeModule, 'authenticator' | 'authorizer'>;
    protectedModule: ProtectedRuntimeModule;
  }>
): void {
  const workspaceFiles = new LocalWorkspaceFileRepository({
    root: options.protectedModule.workspaceFilesRoot,
  });
  const projectGraph = options.protectedModule.dbtProjectImport.projectGraphUseCase;
  const resolver = new DbtYamlDescriptionResourceResolver({ projectGraph });
  const mutator = new YamlCstDbtDescriptionMutator();
  const batchMutation = new LocalWorkspaceFileBatchMutationGateway({
    root: options.protectedModule.workspaceFilesRoot,
  });
  const receipts = new WorkspaceMetadataDbtYamlDescriptionReceiptStore({
    metadataFiles: new LocalWorkspaceMetadataFileRepository({
      root: options.protectedModule.workspaceFilesRoot,
    }),
  });
  const proposalQuery = new ProposeDbtYamlDescriptionEditQuery({
    resolver,
    workspaceFiles,
    mutator,
  });
  const applyCommand = new ApplyDbtYamlDescriptionEditCommand({
    resolver,
    workspaceFiles,
    batchMutation,
    mutator,
    projectGraph,
    receipts,
  });
  const revertCommand = new RevertDbtYamlDescriptionEditCommand({
    workspaceFiles,
    batchMutation,
    mutator,
    projectGraph,
    receipts,
  });

  registerDbtYamlDescriptionEditRoutes(app, {
    ...options.runtimeAuth,
    proposalQuery,
    applyCommand,
    revertCommand,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
