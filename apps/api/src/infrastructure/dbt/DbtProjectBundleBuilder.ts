/** Owned concern: persist a revision-bound DBT project bundle in the configured artifact store. */
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, open, readFile, rm, type FileHandle } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { DbtProjectBundleArtifactStore } from '@dvt/artifacts';
import { buildCanonicalDbtProjectBundleRelativePath } from '@dvt/contracts';

import type {
  DbtProjectBundleBuildResult,
  IDbtProjectBundleBuilder,
} from '../../application/ports/dbtProjectBundle.js';

import type { ProjectContentLimits } from './dbtProjectContentRevision.js';
import { snapshotDbtProjectSource } from './dbtProjectSourceSnapshot.js';
import { createDbtProjectTarArchive } from './dbtProjectTarArchive.js';
import { resolveDbtProjectDirectory } from './dbtProjectWorkspaceBoundary.js';

export class DbtProjectBundleBuilder implements IDbtProjectBundleBuilder {
  public constructor(
    private readonly options: Readonly<{
      workspaceFilesRoot: string;
      bundleStore: DbtProjectBundleArtifactStore | undefined;
      limits: ProjectContentLimits;
    }>
  ) {}

  public async build(
    input: Parameters<IDbtProjectBundleBuilder['build']>[0]
  ): Promise<DbtProjectBundleBuildResult> {
    if (this.options.bundleStore === undefined) {
      return { ok: false, reason: 'artifact_store_unavailable' };
    }
    if (this.options.bundleStore.kind !== 'file') {
      return { ok: false, reason: 'artifact_store_unsupported' };
    }

    let projectDirectory: string;
    try {
      projectDirectory = await resolveDbtProjectDirectory({
        workspaceFilesRoot: this.options.workspaceFilesRoot,
        scope: input.scope,
        projectRoot: input.projectRoot,
      });
    } catch {
      return { ok: false, reason: 'project_unavailable' };
    }

    const snapshotRoot = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-bundle-'));
    try {
      const snapshotDirectory = path.join(snapshotRoot, 'project');
      let revision: Awaited<ReturnType<typeof snapshotDbtProjectSource>>;
      try {
        revision = await snapshotDbtProjectSource({
          projectDirectory,
          snapshotDirectory,
          limits: this.options.limits,
        });
      } catch {
        return { ok: false, reason: 'project_unreadable' };
      }

      if (
        input.expectedContentSetSha256 !== undefined &&
        revision.sha256 !== input.expectedContentSetSha256
      ) {
        return {
          ok: false,
          reason: 'revision_mismatch',
          expectedContentSetSha256: input.expectedContentSetSha256,
          actualContentSetSha256: revision.sha256,
        };
      }

      const archive = await createDbtProjectTarArchive(snapshotDirectory);
      const tenantId = input.scope.tenantId;
      const bundlePath = path.resolve(
        this.options.bundleStore.rootPath,
        buildCanonicalDbtProjectBundleRelativePath(tenantId, archive.sha256)
      );
      await persistContentAddressedFile(bundlePath, archive.bytes, archive.sha256);
      return {
        ok: true,
        contentSetSha256: revision.sha256,
        projectBundleRef: {
          uri: pathToFileURL(bundlePath).href,
          kind: 'dbt-project-bundle',
          sha256: archive.sha256,
          tenantId,
          sizeBytes: archive.bytes.byteLength,
        },
      };
    } finally {
      await rm(snapshotRoot, { recursive: true, force: true });
    }
  }
}

async function persistContentAddressedFile(
  artifactPath: string,
  bytes: Buffer,
  expectedSha256: string
): Promise<void> {
  await mkdir(path.dirname(artifactPath), { recursive: true });
  let handle: FileHandle | null = null;
  try {
    handle = await open(artifactPath, 'wx');
    await writeAll(handle, bytes);
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
    const existing = await readFile(artifactPath);
    const existingSha256 = createHash('sha256').update(existing).digest('hex');
    if (existingSha256 !== expectedSha256) {
      throw new Error('Existing DBT bundle does not match its content-addressed locator.', {
        cause: error,
      });
    }
  } finally {
    await handle?.close();
  }
}

async function writeAll(handle: FileHandle, bytes: Buffer): Promise<void> {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const result = await handle.write(bytes, offset, bytes.byteLength - offset, null);
    if (result.bytesWritten === 0) throw new Error('DBT bundle write made no progress.');
    offset += result.bytesWritten;
  }
}

function isAlreadyExistsError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}
