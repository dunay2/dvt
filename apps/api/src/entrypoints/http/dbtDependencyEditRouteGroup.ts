/** Owned concern: compose the protected DBT dependency-edit command route. */
import type { FastifyInstance } from 'fastify';

import { ApplySelectedDbtDependencyEditCommand } from '../../application/services/dbtDependencyEdit/ApplySelectedDbtDependencyEditCommand.js';
import { DbtCliProjectCandidateAnalyzer } from '../../infrastructure/dbt/DbtCliProjectCandidateAnalyzer.js';
import { DEFAULT_DBT_PROJECT_SOURCE_LIMITS } from '../../infrastructure/dbt/dbtProjectSourceSnapshot.js';
import { WorkspaceMetadataDbtDependencyEditReceiptStore } from '../../infrastructure/dbtDependencyEdit/WorkspaceMetadataDbtDependencyEditReceiptStore.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import { LocalWorkspaceFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import { LocalWorkspaceMetadataFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerDbtDependencyEditRoutes } from './dbtDependencyEditRoutes.js';

export function registerProtectedDbtDependencyEditRouteGroup(
  app: FastifyInstance,
  options: Readonly<{
    env: Env;
    runtimeAuth: Pick<ProtectedRuntimeModule, 'authenticator' | 'authorizer'>;
    protectedModule: ProtectedRuntimeModule;
  }>
): void {
  const workspaceFilesRoot = options.protectedModule.workspaceFilesRoot;
  const analyzerOptions = {
    workspaceFilesRoot,
    ...(options.env.DVT_DBT_ANALYZER_PROFILES_DIR === undefined
      ? {}
      : { profilesDirectory: options.env.DVT_DBT_ANALYZER_PROFILES_DIR }),
    dbtExecutable: options.env.DVT_DBT_ANALYZER_BIN,
    timeoutMs: options.env.DVT_DBT_ANALYZER_TIMEOUT_MS,
    maxOutputBytes: options.env.DVT_DBT_ANALYZER_MAX_OUTPUT_BYTES,
  };
  const command = new ApplySelectedDbtDependencyEditCommand({
    resolver: options.protectedModule.dbtProjectImport.selectedModelAnalysisResolver,
    workspaceFiles: new LocalWorkspaceFileRepository({ root: workspaceFilesRoot }),
    candidateAnalyzer: new DbtCliProjectCandidateAnalyzer(analyzerOptions),
    batchMutation: new LocalWorkspaceFileBatchMutationGateway({
      root: workspaceFilesRoot,
      maxBatchFiles: DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxFiles,
    }),
    receipts: new WorkspaceMetadataDbtDependencyEditReceiptStore({
      metadataFiles: new LocalWorkspaceMetadataFileRepository({ root: workspaceFilesRoot }),
    }),
  });

  registerDbtDependencyEditRoutes(app, {
    ...options.runtimeAuth,
    command,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
