import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseExecutionSelection,
  parsePlanRef,
  parseRunExecutionContextRef,
  type StartRunCommand,
} from '@dvt/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DbtRunExecutionContextBindingUseCase } from '../../../src/application/services/DbtRunExecutionContextBindingUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

import { buildAuthorizedContext } from './engineStartRunUseCase.test.support.js';

const tempRoots: string[] = [];

describe('DBT runtime bundle security boundary', () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
    );
  });

  it('rejects workspace profiles before bundle materialization or engine dispatch', async () => {
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

    const execution = await executeBinding({ workspaceRoot, bundleRoot });

    expect(execution.result).toEqual({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        code: 'REJECTED',
        reason:
          'dbt workspace profiles.yml requires a server-owned profile reference before runtime execution',
        cause: 'run_execution_context',
      },
    });
    expect(execution.delegate.execute).not.toHaveBeenCalled();
    expect(await readdir(bundleRoot)).toEqual([]);
  });

  it('rejects caller-provided DBT run context references before engine dispatch', async () => {
    const workspaceRoot = await makeTempRoot('dvt-api-dbt-ref-workspace-');
    const bundleRoot = await makeTempRoot('dvt-api-dbt-ref-bundles-');
    await writeWorkspaceFiles(workspaceRoot);
    const planId = '9'.repeat(64);

    const execution = await executeBinding({
      workspaceRoot,
      bundleRoot,
      runExecutionContextRef: parseRunExecutionContextRef({
        uri: 'file:///caller/run-context.json',
        sha256: '7'.repeat(64),
        schemaVersion: 'v1.0',
        planId,
        planVersion: '1.0',
      }),
    });

    expect(execution.result).toEqual({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        code: 'REJECTED',
        reason:
          'caller-provided run execution context references are not accepted for dbt execution',
        cause: 'run_execution_context',
      },
    });
    expect(execution.delegate.execute).not.toHaveBeenCalled();
    expect(await readdir(bundleRoot)).toEqual([]);
  });
});

async function executeBinding(input: {
  readonly workspaceRoot: string;
  readonly bundleRoot: string;
  readonly runExecutionContextRef?: StartRunCommand['runExecutionContextRef'];
}): Promise<{
  readonly delegate: { readonly execute: ReturnType<typeof vi.fn> };
  readonly result: Awaited<ReturnType<DbtRunExecutionContextBindingUseCase['execute']>>;
}> {
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

  const result = await useCase.execute(
    {
      ...buildCommand(planId),
      ...(input.runExecutionContextRef === undefined
        ? {}
        : { runExecutionContextRef: input.runExecutionContextRef }),
    },
    buildContext()
  );

  return { delegate, result };
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
