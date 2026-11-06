/** Owned concern: bind root-relocation application ports to the scoped local workspace. */
import type { IDbtProjectRootAuthorityPort } from '../../application/ports/dbtProjectRootRelocation.js';
import type { CanvasAuthoringAuthorityPolicy } from '../../application/services/canvasAuthoringAuthorityPolicy.js';
import { PreviewDbtProjectRootRelocationQuery } from '../../application/services/dbtProjectRootRelocation/PreviewDbtProjectRootRelocationQuery.js';
import { RelocateDbtProjectRootCommand } from '../../application/services/dbtProjectRootRelocation/RelocateDbtProjectRootCommand.js';
import { LocalDbtProjectImportInspector } from '../../infrastructure/dbt/LocalDbtProjectImportInspector.js';
import {
  LocalWorkspaceFileBatchMutationGateway,
  DEFAULT_LOCAL_WORKSPACE_FILE_BATCH_LIMITS,
} from '../../infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import { LocalWorkspaceFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import { LocalWorkspaceMetadataFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceMetadataFileRepository.js';
import { LocalWorkspaceRootInventory } from '../../infrastructure/workspaceFiles/LocalWorkspaceRootInventory.js';

export function buildDbtProjectRootRelocationRuntime(
  input: Readonly<{
    workspaceFilesRoot: string;
    authorities: IDbtProjectRootAuthorityPort;
    authorityPolicy: CanvasAuthoringAuthorityPolicy;
  }>
) {
  const deps = {
    authorities: input.authorities,
    authorityPolicy: input.authorityPolicy,
    workspaceFiles: new LocalWorkspaceFileRepository({ root: input.workspaceFilesRoot }),
    inventory: new LocalWorkspaceRootInventory(input.workspaceFilesRoot),
    inspector: new LocalDbtProjectImportInspector({ workspaceFilesRoot: input.workspaceFilesRoot }),
    maxBytes: DEFAULT_LOCAL_WORKSPACE_FILE_BATCH_LIMITS.maxBatchBytes,
  };
  return {
    previewQuery: new PreviewDbtProjectRootRelocationQuery(deps),
    relocateCommand: new RelocateDbtProjectRootCommand({
      ...deps,
      metadata: new LocalWorkspaceMetadataFileRepository({ root: input.workspaceFilesRoot }),
      batchMutation: new LocalWorkspaceFileBatchMutationGateway({ root: input.workspaceFilesRoot }),
      nowIso: () => new Date().toISOString(),
    }),
  };
}
export type DbtProjectRootRelocationRuntime = ReturnType<
  typeof buildDbtProjectRootRelocationRuntime
>;
