import type { DbtProjectBundleRef } from '@dvt/contracts';

import type { WorkspaceStorageScope } from './workspaceFiles.js';

export type DbtProjectBundleBuildResult =
  | Readonly<{
      ok: true;
      projectBundleRef: DbtProjectBundleRef;
      contentSetSha256: string;
    }>
  | Readonly<{
      ok: false;
      reason:
        | 'artifact_store_unavailable'
        | 'artifact_store_unsupported'
        | 'project_unavailable'
        | 'project_unreadable'
        | 'revision_mismatch';
      expectedContentSetSha256?: string;
      actualContentSetSha256?: string;
    }>;

export interface IDbtProjectBundleBuilder {
  build(input: {
    readonly scope: WorkspaceStorageScope;
    readonly projectRoot: string;
    readonly expectedContentSetSha256?: string;
  }): Promise<DbtProjectBundleBuildResult>;
}
