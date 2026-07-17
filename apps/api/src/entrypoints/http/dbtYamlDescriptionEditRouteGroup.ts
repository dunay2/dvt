/** Owned concern: compose the protected dbt YAML description edit route group. */
import type { FastifyInstance } from 'fastify';

import { DbtYamlDescriptionEditTransaction } from '../../application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.js';
import { YamlCstDbtDescriptionMutator } from '../../infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import { LocalWorkspaceFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
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
  const transaction = new DbtYamlDescriptionEditTransaction({
    workspaceFiles,
    batchMutation: new LocalWorkspaceFileBatchMutationGateway({
      root: options.protectedModule.workspaceFilesRoot,
    }),
    mutator: new YamlCstDbtDescriptionMutator(),
    projectGraph: options.protectedModule.dbtProjectImport.projectGraphUseCase,
  });

  registerDbtYamlDescriptionEditRoutes(app, {
    ...options.runtimeAuth,
    transaction,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
