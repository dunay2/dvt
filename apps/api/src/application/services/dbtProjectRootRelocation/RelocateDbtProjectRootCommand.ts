/** Owned concern: relocate proven file bytes and their authority reference with durable recovery evidence. */
import {
  DbtProjectRootRelocationPlanSchema,
  DbtProjectRootRelocationReceiptSchema,
  DBT_PROJECT_ROOT_RELOCATION_MAX_FILES,
  type DbtProjectRootRelocationPlan,
  type DbtProjectRootRelocationResult,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod/v4';

import {
  RootRelocationRefusedError,
  rootRelocationAuthorityRevision,
} from '../../ports/dbtProjectRootRelocation.js';
import {
  WorkspaceFileNotFoundError,
  type IWorkspaceFileBatchMutationPort,
  type IWorkspaceMetadataFileRepository,
  type WorkspaceFileBatchMutation,
  type WorkspaceFileContent,
  type WorkspaceStorageScope,
} from '../../ports/workspaceFiles.js';

import {
  inspectDbtProjectRootRelocation,
  readOptionalRelocationFile,
  relocationRefusal,
  type RootRelocationPlanningDependencies,
} from './relocationPlan.js';

const SnapshotSchema = z
  .object({
    schemaVersion: z.literal('dbt-project-root-relocation-snapshot.v1'),
    plan: DbtProjectRootRelocationPlanSchema,
    files: z
      .array(z.object({ path: z.string(), content: z.string() }).strict())
      .max(DBT_PROJECT_ROOT_RELOCATION_MAX_FILES),
    receipt: DbtProjectRootRelocationReceiptSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const files = new Map(value.files.map((file) => [file.path, file.content]));
    if (
      files.size !== value.files.length ||
      files.size !== value.plan.files.length ||
      value.plan.files.some(
        (file) =>
          !files.has(file.sourcePath) ||
          sha256HexUtf8(files.get(file.sourcePath)!) !== file.contentSha256
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The recovery snapshot does not match the original file bytes.',
      });
    }
    if (
      value.receipt !== undefined &&
      (value.receipt.planSha256 !== value.plan.planSha256 ||
        value.receipt.canvasId !== value.plan.canvasId ||
        value.receipt.authorityRevision !== rootRelocationAuthorityRevision(value.plan))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'The recovery receipt does not match the plan.',
      });
    }
  });
type Snapshot = z.infer<typeof SnapshotSchema>;
type SnapshotRead = Readonly<{ value: Snapshot; file: WorkspaceFileContent }>;
type Dependencies = RootRelocationPlanningDependencies &
  Readonly<{
    batchMutation: IWorkspaceFileBatchMutationPort;
    metadata: IWorkspaceMetadataFileRepository;
    nowIso: () => string;
  }>;

export class RelocateDbtProjectRootCommand {
  public constructor(private readonly deps: Dependencies) {}

  public async execute(
    input: Readonly<{ scope: WorkspaceStorageScope; plan: DbtProjectRootRelocationPlan }>
  ): Promise<DbtProjectRootRelocationResult> {
    const parsed = DbtProjectRootRelocationPlanSchema.safeParse(input.plan);
    if (!parsed.success) return { kind: 'refused', reason: 'unsafe_project' };
    const plan = parsed.data;
    if (
      plan.scope.tenantId !== input.scope.tenantId ||
      plan.scope.projectId !== input.scope.projectId ||
      plan.scope.environmentId !== input.scope.environmentId
    ) {
      return { kind: 'refused', reason: 'scope_mismatch' };
    }
    try {
      const outcome = await this.deps.authorities.commitRootRelocation(
        {
          key: { ...input.scope, canvasId: plan.canvasId },
          sourceRoot: plan.sourceRoot,
          expectedRevision: plan.authorityRevision,
          newRevision: rootRelocationAuthorityRevision(plan),
          nowIso: this.deps.nowIso(),
        },
        async () => {
          const snapshot = await this.prepareSnapshot(plan);
          const mutation = await this.prepareFileMutation(plan, snapshot.value);
          const result = await this.deps.batchMutation.apply(input.scope, mutation);
          if (result.kind === 'conflict')
            throw new RootRelocationRefusedError(
              'stale_files',
              result.conflicts.map((file) => file.path)
            );
        }
      );
      if (outcome.kind === 'refused') return outcome;
      const snapshot = await this.readSnapshot(plan);
      if (snapshot === null) throw new RootRelocationRefusedError('recovery_conflict');
      if (snapshot.value.receipt !== undefined)
        return { ...snapshot.value.receipt, deduplicated: true };
      const empty = await this.deps.inventory.removeEmptyDirectories(input.scope, plan.sourceRoot);
      const receipt = DbtProjectRootRelocationReceiptSchema.parse({
        kind: 'relocated',
        planSha256: plan.planSha256,
        canvasId: plan.canvasId,
        projectRoot: '.',
        authorityRevision: outcome.record.revision,
        deduplicated: false,
        sourceDirectoryRetained: !empty,
      });
      const saved = await this.deps.metadata.saveFileContent(input.scope, {
        path: snapshotPath(plan),
        content: JSON.stringify({ ...snapshot.value, receipt }),
        expectedRevision: { kind: 'content_sha256', value: snapshot.file.contentSha256 },
      });
      if (saved.kind === 'conflict') {
        const completed = await this.readSnapshot(plan);
        if (completed?.value.receipt === undefined)
          throw new RootRelocationRefusedError('recovery_conflict');
        return { ...completed.value.receipt, deduplicated: true };
      }
      return { ...receipt, deduplicated: outcome.deduplicated };
    } catch (error) {
      const refusal = relocationRefusal(error);
      if (refusal !== undefined) return refusal;
      throw error;
    }
  }

  private async readSnapshot(plan: DbtProjectRootRelocationPlan): Promise<SnapshotRead | null> {
    let file: WorkspaceFileContent;
    try {
      file = await this.deps.metadata.getFileContent(plan.scope, snapshotPath(plan));
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) return null;
      throw error;
    }
    try {
      const value = SnapshotSchema.parse(JSON.parse(file.content));
      if (value.plan.planSha256 !== plan.planSha256)
        throw new RootRelocationRefusedError('recovery_conflict');
      return { value, file };
    } catch {
      throw new RootRelocationRefusedError('recovery_conflict');
    }
  }

  private async prepareSnapshot(plan: DbtProjectRootRelocationPlan): Promise<SnapshotRead> {
    const previous = await this.readSnapshot(plan);
    if (previous !== null) {
      if (previous.value.receipt !== undefined)
        throw new RootRelocationRefusedError('recovery_conflict');
      return previous;
    }
    const inspection = await inspectDbtProjectRootRelocation(this.deps, {
      scope: plan.scope,
      canvasId: plan.canvasId,
    });
    if (
      inspection.preview.kind !== 'ready' ||
      inspection.preview.plan.planSha256 !== plan.planSha256
    ) {
      throw new RootRelocationRefusedError(
        inspection.preview.kind === 'refused' ? inspection.preview.reason : 'stale_files'
      );
    }
    const value = SnapshotSchema.parse({
      schemaVersion: 'dbt-project-root-relocation-snapshot.v1',
      plan,
      files: inspection.files,
    });
    const saved = await this.deps.metadata.saveFileContent(plan.scope, {
      path: snapshotPath(plan),
      content: JSON.stringify(value),
      expectedRevision: { kind: 'absent' },
    });
    if (saved.kind === 'conflict') {
      const existing = await this.readSnapshot(plan);
      if (existing === null) throw new RootRelocationRefusedError('recovery_conflict');
      return existing;
    }
    const snapshot = await this.readSnapshot(plan);
    if (snapshot === null) throw new RootRelocationRefusedError('recovery_conflict');
    return snapshot;
  }

  private async prepareFileMutation(
    plan: DbtProjectRootRelocationPlan,
    snapshot: Snapshot
  ): Promise<WorkspaceFileBatchMutation> {
    const currentInventory = await this.deps.inventory.listFiles(plan.scope, plan.sourceRoot);
    const allowed = new Set(
      plan.files.flatMap((file) => [
        file.sourcePath,
        ...(file.targetPath.startsWith(`${plan.sourceRoot}/`) ? [file.targetPath] : []),
      ])
    );
    const extra = currentInventory.filter((file) => !allowed.has(file));
    if (extra.length > 0) throw new RootRelocationRefusedError('inventory_changed', extra);
    const content = new Map(snapshot.files.map((file) => [file.path, file.content]));
    const expectedFiles: WorkspaceFileBatchMutation['expectedFiles'][number][] = [];
    const writes: WorkspaceFileBatchMutation['writes'][number][] = [];
    const deletes: string[] = [];
    for (const file of plan.files) {
      const source = await readOptionalRelocationFile(
        this.deps.workspaceFiles,
        plan.scope,
        file.sourcePath
      );
      const target = await readOptionalRelocationFile(
        this.deps.workspaceFiles,
        plan.scope,
        file.targetPath
      );
      if (
        (source !== null && source.contentSha256 !== file.contentSha256) ||
        (target !== null && target.contentSha256 !== file.contentSha256)
      ) {
        throw new RootRelocationRefusedError('stale_files', [file.sourcePath, file.targetPath]);
      }
      if (source === null && target === null)
        throw new RootRelocationRefusedError('recovery_conflict', [file.sourcePath]);
      expectedFiles.push({
        path: file.sourcePath,
        ...(source ? { expectedContentSha256: source.contentSha256 } : {}),
      });
      expectedFiles.push({
        path: file.targetPath,
        ...(target ? { expectedContentSha256: target.contentSha256 } : {}),
      });
      if (target === null)
        writes.push({ path: file.targetPath, content: content.get(file.sourcePath)! });
      if (source !== null) deletes.push(file.sourcePath);
    }
    return {
      expectedFiles,
      writes,
      deletes,
      expectedInventory: { root: plan.sourceRoot, paths: currentInventory },
      idempotencyKey: `root-relocation:${plan.planSha256}:${sha256HexUtf8(JSON.stringify(expectedFiles))}`,
    };
  }
}

function snapshotPath(plan: DbtProjectRootRelocationPlan): string {
  return `.dvt/dbt-root-relocations/${plan.planSha256}.json`;
}
