import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  DbtDependencyEditAppliedReceiptSchema,
  type DbtDependencyEditAppliedReceipt,
} from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { DbtDependencyEditPublication } from '../../../src/application/ports/dbtDependencyEdit.js';
import type { DbtProjectAnalysisFile } from '../../../src/application/ports/dbtProjectAnalysis.js';
import { LocalDbtDependencyEditPublicationGateway } from '../../../src/infrastructure/dbtDependencyEdit/LocalDbtDependencyEditPublicationGateway.js';
import {
  LocalWorkspaceFileMutationCoordinator,
  type LocalWorkspaceFileMutationOperations,
} from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.js';
import { LocalWorkspaceFileRepository } from '../../../src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import {
  resolveWorkspaceScopeMutationLockKey,
  resolveWorkspaceScopeStorageRoot,
} from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' } as const;
const PROJECT_ROOT = 'analytics';
const PREVIOUS_SQL = "-- keep\nselect * from {{ source('raw', 'orders') }}\n";
const CANDIDATE_SQL = "-- keep\nselect * from {{ source('raw', 'customers') }}\n";
const PROJECT_CONFIG = [
  'name: analytics',
  "version: '1.0'",
  'profile: analytics',
  'model-paths:',
  '  - models',
  '',
].join('\n');
const SOURCES_YAML = 'sources: []\n';

describe('LocalDbtDependencyEditPublicationGateway', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-edit-publication-'));
    await writeProject(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('publishes the proven patch and immutable semantic receipt in one transaction', async () => {
    const gateway = new LocalDbtDependencyEditPublicationGateway({ root });
    const publication = createPublication();

    const result = await gateway.publish(SCOPE, publication);

    expect(result).toEqual({ kind: 'applied', receipt: publication.receipt });
    await expect(readProjectFile(root, 'models/orders.sql')).resolves.toBe(CANDIDATE_SQL);
    await expect(gateway.findApplied(SCOPE, publication.receipt.receiptId)).resolves.toEqual(
      publication.receipt
    );

    const replay = await gateway.publish(SCOPE, publication);
    expect(replay).toEqual({
      kind: 'applied',
      receipt: { ...publication.receipt, deduplicated: true },
    });
  });

  it('rejects a canonical DBT file added after candidate validation', async () => {
    const gateway = new LocalDbtDependencyEditPublicationGateway({ root });
    const publication = createPublication();
    await writeProjectFile(root, 'models/new_model.sql', 'select 1\n');

    const result = await gateway.publish(SCOPE, publication);

    expect(result).toEqual({
      kind: 'conflict',
      conflicts: [
        {
          path: 'analytics/models/new_model.sql',
          currentContentSha256: sha('select 1\n'),
        },
      ],
    });
    await expect(readProjectFile(root, 'models/orders.sql')).resolves.toBe(PREVIOUS_SQL);
    await expect(gateway.findApplied(SCOPE, publication.receipt.receiptId)).resolves.toBeNull();
  });

  it('rolls back the source patch and receipt when atomic publication fails midway', async () => {
    let publishedFiles = 0;
    const coordinator = new LocalWorkspaceFileMutationCoordinator(
      createFileSystemOperations({
        renameFile: async (source, target) => {
          if (source.includes('.next.')) {
            publishedFiles += 1;
            if (publishedFiles === 2) throw new Error('injected publication failure');
          }
          await rename(source, target);
        },
      })
    );
    const gateway = new LocalDbtDependencyEditPublicationGateway({
      root,
      mutationCoordinator: coordinator,
    });
    const publication = createPublication();

    await expect(gateway.publish(SCOPE, publication)).rejects.toThrow(
      'injected publication failure'
    );

    await expect(readProjectFile(root, 'models/orders.sql')).resolves.toBe(PREVIOUS_SQL);
    await expect(gateway.findApplied(SCOPE, publication.receipt.receiptId)).resolves.toBeNull();
  });

  it('serializes project additions before exact-set validation and refuses the stale publication', async () => {
    const coordinator = new LocalWorkspaceFileMutationCoordinator();
    const gateway = new LocalDbtDependencyEditPublicationGateway({
      root,
      mutationCoordinator: coordinator,
    });
    const repository = new LocalWorkspaceFileRepository({
      root,
      mutationCoordinator: coordinator,
    });
    const scopeLock = resolveWorkspaceScopeMutationLockKey(root, SCOPE);
    let releaseLock: () => void = () => undefined;
    const held = coordinator.runExclusive(
      scopeLock,
      () =>
        new Promise<void>((resolve) => {
          releaseLock = resolve;
        })
    );
    await Promise.resolve();

    const addition = repository.saveFileContent(SCOPE, {
      path: 'analytics/models/concurrent.sql',
      content: 'select 2\n',
      expectedRevision: { kind: 'absent' },
    });
    const publication = gateway.publish(SCOPE, createPublication());
    releaseLock();

    await expect(addition).resolves.toEqual(expect.objectContaining({ kind: 'saved' }));
    await expect(publication).resolves.toEqual({
      kind: 'conflict',
      conflicts: [
        {
          path: 'analytics/models/concurrent.sql',
          currentContentSha256: sha('select 2\n'),
        },
      ],
    });
    await held;
    await expect(readProjectFile(root, 'models/orders.sql')).resolves.toBe(PREVIOUS_SQL);
  });
});

function createPublication(): DbtDependencyEditPublication {
  const expectedFiles = [
    fileRevision('dbt_project.yml', PROJECT_CONFIG, 'project_config'),
    fileRevision('models/orders.sql', PREVIOUS_SQL, 'model'),
    fileRevision('models/sources.yml', SOURCES_YAML, 'source'),
  ];
  const expectedProjectContentSetSha256 = sha(
    JSON.stringify(
      expectedFiles.map((file) => ({
        path: file.path,
        sha256: file.revisionSha256,
        bytes: file.byteLength,
      }))
    )
  );
  return {
    projectRoot: PROJECT_ROOT,
    expectedProjectContentSetSha256,
    expectedFiles,
    write: {
      path: 'analytics/models/orders.sql',
      expectedContentSha256: sha(PREVIOUS_SQL),
      content: CANDIDATE_SQL,
    },
    receipt: appliedReceipt(expectedProjectContentSetSha256),
  };
}

function fileRevision(
  filePath: string,
  content: string,
  kind: 'project_config' | 'model' | 'source'
): DbtProjectAnalysisFile {
  return {
    path: filePath,
    revisionSha256: sha(content),
    byteLength: Buffer.byteLength(content, 'utf8'),
    kind,
  } as const;
}

function appliedReceipt(previousProjectContentSetSha256: string): DbtDependencyEditAppliedReceipt {
  return DbtDependencyEditAppliedReceiptSchema.parse({
    schemaVersion: 'dbt-dependency-edit-applied-receipt.v1',
    receiptId: '1'.repeat(64),
    canvasId: 'canvas-orders',
    selectedUniqueId: 'model.analytics.orders',
    regionId: 'region-source',
    path: 'analytics/models/orders.sql',
    previousTargetUniqueId: 'source.analytics.raw.orders',
    nextTargetUniqueId: 'source.analytics.raw.customers',
    expectedContentSha256: sha(PREVIOUS_SQL),
    appliedContentSha256: sha(CANDIDATE_SQL),
    previousProjectContentSetSha256,
    projectContentSetSha256: '5'.repeat(64),
    previousAnalysisSha256: '6'.repeat(64),
    analysisSha256: '7'.repeat(64),
    previousSelectedAnalysisSha256: '8'.repeat(64),
    selectedAnalysisSha256: '9'.repeat(64),
    idempotencyKey: 'edit-1',
    requestHash: 'a'.repeat(64),
    deduplicated: false,
  });
}

async function writeProject(root: string): Promise<void> {
  await writeProjectFile(root, 'dbt_project.yml', PROJECT_CONFIG);
  await writeProjectFile(root, 'models/orders.sql', PREVIOUS_SQL);
  await writeProjectFile(root, 'models/sources.yml', SOURCES_YAML);
}

async function writeProjectFile(
  root: string,
  relativePath: string,
  content: string
): Promise<void> {
  const filePath = path.join(
    resolveWorkspaceScopeStorageRoot(root, SCOPE),
    PROJECT_ROOT,
    ...relativePath.split('/')
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

async function readProjectFile(root: string, relativePath: string): Promise<string> {
  return readFile(
    path.join(
      resolveWorkspaceScopeStorageRoot(root, SCOPE),
      PROJECT_ROOT,
      ...relativePath.split('/')
    ),
    'utf8'
  );
}

function sha(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function createFileSystemOperations(
  overrides: Partial<LocalWorkspaceFileMutationOperations> = {}
): LocalWorkspaceFileMutationOperations {
  return {
    createDirectory: async (directoryPath) => {
      await mkdir(directoryPath, { recursive: true });
    },
    writeTemporaryFile: async (filePath, content) => {
      await writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' });
    },
    renameFile: rename,
    removeFile: async (filePath) => {
      await rm(filePath, { force: true });
    },
    deleteFile: async (filePath) => {
      await rm(filePath, { force: false });
    },
    removeDirectory: async (directoryPath) => {
      await rm(directoryPath, { recursive: true, force: true });
    },
    ...overrides,
  };
}
