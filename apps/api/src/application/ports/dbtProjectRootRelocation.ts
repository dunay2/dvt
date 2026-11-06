/** Owned concern: define the root-relocation authority, inventory and inspection ports. */
import type {
  DbtProjectRootRelocationPlan,
  DbtProjectRootRelocationPreview,
  DbtProjectRootRelocationRefusalReason,
  DbtProjectRootRelocationResult,
} from '@dvt/contracts';

import type {
  CanvasAuthoringAuthorityKey,
  CanvasAuthoringAuthorityStoredRecord,
} from './canvasAuthoringAuthority.js';
import type { WorkspaceStorageScope } from './workspaceFiles.js';

export interface IDbtProjectRootAuthorityPort {
  /** At most two owners are sufficient to reject ambiguous project roots. */
  readProjectFileAuthorities(
    scope: WorkspaceStorageScope
  ): Promise<readonly CanvasAuthoringAuthorityStoredRecord[]>;
  commitRootRelocation(
    input: Readonly<{
      key: CanvasAuthoringAuthorityKey;
      sourceRoot: string;
      expectedRevision: string;
      newRevision: string;
      nowIso: string;
    }>,
    publishFiles: () => Promise<void>
  ): Promise<
    | Readonly<{
        kind: 'relocated';
        record: CanvasAuthoringAuthorityStoredRecord;
        deduplicated: boolean;
      }>
    | RootRelocationRefusal
  >;
}

export interface IDbtProjectRootInventoryPort {
  listFiles(scope: WorkspaceStorageScope, root: string): Promise<readonly string[]>;
  removeEmptyDirectories(scope: WorkspaceStorageScope, root: string): Promise<boolean>;
}

export type RootRelocationRefusal = Extract<DbtProjectRootRelocationResult, { kind: 'refused' }>;
export type RootRelocationSnapshotFile = Readonly<{ path: string; content: string }>;
export type RootRelocationInspection = Readonly<{
  preview: DbtProjectRootRelocationPreview;
  files: readonly RootRelocationSnapshotFile[];
}>;

export class RootRelocationRefusedError extends Error {
  public constructor(
    public readonly reason: DbtProjectRootRelocationRefusalReason,
    public readonly paths: readonly string[] = []
  ) {
    super(`dbt root relocation refused: ${reason}`);
    this.name = 'RootRelocationRefusedError';
  }
}

export function rootRelocationAuthorityRevision(plan: DbtProjectRootRelocationPlan): string {
  return `authority-root-${plan.planSha256}`;
}
