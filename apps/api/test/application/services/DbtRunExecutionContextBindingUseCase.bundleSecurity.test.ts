import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import { promisify } from 'node:util';
import { gunzip } from 'node:zlib';

import { parseExecutionSelection, parsePlanRef, type StartRunCommand } from '@dvt/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DbtRunExecutionContextBindingUseCase } from '../../../src/application/services/DbtRunExecutionContextBindingUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

import { buildAuthorizedContext } from './engineStartRunUseCase.test.support.js';

const gunzipAsync = promisify(gunzip);
const tempRoots: string[] = [];

describe('DBT runtime bundle security boundary', () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
    );
  });

  it('excludes profiles.yml entries and secret bytes at every path depth', async () => {
    const workspaceRoot = await makeTempRoot('dvt-api-dbt-secret-workspace-');
    const bundleRoot = await makeTempRoot('dvt-api-dbt-secret-bundles-');
    const rootSecret = 'root-profile-secret-sentinel';
    const nestedSecret = 'nested-profile-secret-sentinel';
    await writeWorkspaceFiles(workspaceRoot);
    await writeFile(join(workspaceRoot, 'profiles.yml'), `token: ${rootSecret}\n`);
    await mkdir(join(workspaceRoot, 'models', 'private'), { recursive: true });
    await writeFile(
      join(workspaceRoot, 'models', 'private', 'profiles.yml'),
      `password: ${nestedSecret}\n`
    );

    const entries = await executeBindingAndReadBundleEntries({ workspaceRoot, bundleRoot });

    expect([...entries.keys()]).toEqual(
      expect.arrayContaining(['bundle/dbt_project.yml', 'bundle/models/model_1.sql'])
    );
    expect([...entries.keys()]).not.toContain('bundle/profiles.yml');
    expect([...entries.keys()]).not.toContain('bundle/models/private/profiles.yml');
    const bundledContent = Buffer.concat([...entries.values()]).toString('utf8');
    expect(bundledContent).not.toContain(rootSecret);
    expect(bundledContent).not.toContain(nestedSecret);
  });
});

async function executeBindingAndReadBundleEntries(input: {
  readonly workspaceRoot: string;
  readonly bundleRoot: string;
}): Promise<ReadonlyMap<string, Buffer>> {
  const planId = '9'.repeat(64);
  const delegate = {
    execute: vi.fn(
      async (_command: StartRunCommand, _context: ReturnType<typeof buildContext>) => ({
        ok: true as const,
        value: { kind: 'accepted' as const, runId: 'run-secret-test', accepted: true as const },
      })
    ),
  };
  const useCase = new DbtRunExecutionContextBindingUseCase({
    delegate,
    planStore: {
      fetchStoredPlanArtifactForValidation: vi.fn(async () => ({
        executionPolicy: {},
        bytes: buildDbtPlanBytes(planId),
      })),
    },
    resolveWorkspaceRoot: () => input.workspaceRoot,
    dbtBundleStore: { kind: 'file' as const, rootPath: input.bundleRoot },
  });

  await useCase.execute(buildCommand(planId), buildContext());

  const enrichedCommand = delegate.execute.mock.calls[0]?.[0] as StartRunCommand | undefined;
  expect(enrichedCommand?.runExecutionContextRef).toBeDefined();
  const contextBytes = await readFile(new URL(enrichedCommand!.runExecutionContextRef!.uri));
  const contextPayload = JSON.parse(contextBytes.toString('utf8')) as {
    pluginContexts: { dbt?: { projectBundleRef?: { uri: string } } };
  };
  const bundleUri = contextPayload.pluginContexts.dbt?.projectBundleRef?.uri;
  expect(bundleUri).toBeDefined();
  const bundleBytes = await readFile(new URL(bundleUri!));
  return readTarFileEntries(await gunzipAsync(bundleBytes));
}

async function makeTempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

async function writeWorkspaceFiles(workspaceRoot: string): Promise<void> {
  await writeFile(join(workspaceRoot, 'dbt_project.yml'), 'name: canvas_dbt\nversion: "1.0"\n');
  await mkdir(join(workspaceRoot, 'models'), { recursive: true });
  await writeFile(join(workspaceRoot, 'models', 'model_1.sql'), 'select 1 as id\n');
}

function buildDbtPlanBytes(planId: string): Buffer {
  return Buffer.from(
    JSON.stringify({
      metadata: {
        planId,
        planVersion: '1.0',
        schemaVersion: '1.0',
        contractVersion: '1.0.0',
        inputHashSha256: '1'.repeat(64),
        createdAtIso: '2026-07-12T00:00:00.000Z',
      },
      steps: [{ stepId: 'model_1', kind: 'DBT_MODEL', dependsOn: [], stepTypeConfig: {} }],
    }),
    'utf8'
  );
}

function buildCommand(planId: string): StartRunCommand {
  return {
    runId: 'run-secret-test',
    targetAdapter: 'temporal',
    selection: parseExecutionSelection({ mode: 'explicit', nodeIds: ['model_1'] }),
    planRef: parsePlanRef({
      uri: 'dvt-plan://postgres/dbt-secret-plan',
      sha256: '8'.repeat(64),
      schemaVersion: '1.0',
      planId,
      planVersion: '1.0',
    }),
  };
}

function buildContext(): ReturnType<typeof buildAuthorizedContext> {
  return {
    ...buildAuthorizedContext('tenant-1'),
    scope: {
      resource: 'environment' as const,
      tenantId: TenantId.unsafe('tenant-1'),
      projectId: ProjectId.unsafe('proj-1'),
      environmentId: EnvironmentId.unsafe('env-1'),
    },
    authorizedAt: new Date('2026-07-12T00:00:00.000Z'),
  };
}

function readTarFileEntries(tarBytes: Buffer): ReadonlyMap<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const blockSize = 512;
  let offset = 0;

  while (offset + blockSize <= tarBytes.byteLength) {
    const header = tarBytes.subarray(offset, offset + blockSize);
    const name = readTarString(header.subarray(0, 100));
    if (name.length === 0) break;
    const sizeText = readTarString(header.subarray(124, 136)).trim();
    const size = sizeText.length === 0 ? 0 : Number.parseInt(sizeText, 8);
    const payloadOffset = offset + blockSize;
    if (String.fromCharCode(header[156] ?? 0) !== '5') {
      entries.set(name, tarBytes.subarray(payloadOffset, payloadOffset + size));
    }
    offset = payloadOffset + Math.ceil(size / blockSize) * blockSize;
  }

  return entries;
}

function readTarString(bytes: Buffer): string {
  const terminator = bytes.indexOf(0);
  return bytes.subarray(0, terminator === -1 ? bytes.byteLength : terminator).toString('utf8');
}
