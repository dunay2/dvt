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

describe('DbtRunExecutionContextBindingUseCase', () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
    );
  });

  it('binds DBT persisted plans to a generated runExecutionContextRef before engine dispatch', async () => {
    const workspaceRoot = await makeTempRoot('dvt-api-dbt-workspace-');
    const bundleRoot = await makeTempRoot('dvt-api-dbt-bundles-');
    await writeWorkspaceFiles(workspaceRoot);
    const delegate = {
      execute: vi.fn(
        async (_command: StartRunCommand, _context: ReturnType<typeof buildContext>) => ({
          ok: true as const,
          value: { kind: 'accepted' as const, runId: 'run-test-1', accepted: true as const },
        })
      ),
    };
    const planId = 'd'.repeat(64);
    const planRef = parsePlanRef({
      uri: 'dvt-plan://postgres/dbt-plan-1',
      sha256: 'a'.repeat(64),
      schemaVersion: '1.0',
      planId,
      planVersion: '1.0',
    });
    const resolveWorkspaceRoot = vi.fn(() => workspaceRoot);
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate,
      planStore: makePlanStore('DBT_MODEL', planId),
      resolveWorkspaceRoot,
      dbtBundleStore: {
        kind: 'file' as const,
        rootPath: bundleRoot,
      },
    });

    const result = await useCase.execute(
      {
        ...buildCommand(),
        planRef,
      },
      buildContext()
    );

    expect(result).toEqual({
      ok: true,
      value: { kind: 'accepted', runId: 'run-test-1', accepted: true },
    });
    expect(delegate.execute).toHaveBeenCalledTimes(1);
    expect(resolveWorkspaceRoot).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
    });
    const enrichedCommand = delegate.execute.mock.calls[0]?.[0] as StartRunCommand;
    expect(enrichedCommand.runExecutionContextRef).toMatchObject({
      schemaVersion: 'v1.0',
      planId,
      planVersion: '1.0',
    });

    const contextRef = enrichedCommand.runExecutionContextRef;
    expect(contextRef).toBeDefined();
    const contextBytes = await readFile(new URL(contextRef!.uri));
    const contextPayload = JSON.parse(contextBytes.toString('utf8')) as {
      planSha256: string;
      tenantId: string;
      projectId: string;
      environmentId: string;
      pluginContexts: {
        dbt?: {
          projectBundleRef?: {
            uri: string;
            sha256: string;
            tenantId: string;
          };
        };
      };
    };
    expect(contextPayload).toMatchObject({
      planSha256: planRef.sha256,
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
    });
    const bundleRef = contextPayload.pluginContexts.dbt?.projectBundleRef;
    expect(bundleRef).toMatchObject({
      tenantId: 'tenant-1',
    });
    expect(bundleRef?.uri).toContain('/tenants/tenant-1/');
    const bundleBytes = await readFile(new URL(bundleRef!.uri));
    const tarBytes = await gunzipAsync(bundleBytes);
    expect(tarBytes.toString('utf8')).toContain('bundle/dbt_project.yml');
    expect(tarBytes.toString('utf8')).toContain('bundle/models/model_1.sql');
    expect(tarBytes.toString('utf8')).toContain(
      "select * from {{ source('source_1', 'source_1') }}"
    );
  });

  it('delegates non-DBT plans without generating run execution context artifacts', async () => {
    const workspaceRoot = await makeTempRoot('dvt-api-non-dbt-workspace-');
    const bundleRoot = await makeTempRoot('dvt-api-non-dbt-bundles-');
    const delegate = {
      execute: vi.fn(
        async (_command: StartRunCommand, _context: ReturnType<typeof buildContext>) => ({
          ok: true as const,
          value: { kind: 'accepted' as const, runId: 'run-test-1', accepted: true as const },
        })
      ),
    };
    const planId = 'e'.repeat(64);
    const command = {
      ...buildCommand(),
      planRef: parsePlanRef({
        uri: 'dvt-plan://postgres/sql-plan-1',
        sha256: 'b'.repeat(64),
        schemaVersion: '1.0',
        planId,
        planVersion: '1.0',
      }),
    };
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate,
      planStore: makePlanStore(undefined, planId),
      resolveWorkspaceRoot: () => workspaceRoot,
      dbtBundleStore: {
        kind: 'file' as const,
        rootPath: bundleRoot,
      },
    });

    const context = buildContext();

    await useCase.execute(command, context);

    expect(delegate.execute).toHaveBeenCalledWith(command, context);
  });

  it('rejects DBT plans explicitly when the DBT bundle store is not configured', async () => {
    const workspaceRoot = await makeTempRoot('dvt-api-dbt-missing-store-');
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate: {
        execute: vi.fn(async () => ({
          ok: true as const,
          value: { kind: 'accepted' as const, runId: 'run-test-1', accepted: true as const },
        })),
      },
      planStore: makePlanStore('DBT_MODEL', 'f'.repeat(64)),
      resolveWorkspaceRoot: () => workspaceRoot,
      dbtBundleStore: undefined,
    });

    const planId = 'f'.repeat(64);
    const result = await useCase.execute(
      {
        ...buildCommand(),
        planRef: parsePlanRef({
          uri: 'dvt-plan://postgres/dbt-plan-2',
          sha256: 'c'.repeat(64),
          schemaVersion: '1.0',
          planId,
          planVersion: '1.0',
        }),
      },
      buildContext()
    );

    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        code: 'REJECTED',
        reason: 'dbt project bundle artifact store is not configured',
        cause: 'run_execution_context',
      },
    });
  });

  it('rejects DBT auto-binding when the configured bundle store is not file-backed', async () => {
    const workspaceRoot = await makeTempRoot('dvt-api-dbt-s3-store-');
    await writeWorkspaceFiles(workspaceRoot);
    const planId = 'b'.repeat(64);
    const useCase = new DbtRunExecutionContextBindingUseCase({
      delegate: {
        execute: vi.fn(async () => ({
          ok: true as const,
          value: { kind: 'accepted' as const, runId: 'run-test-1', accepted: true as const },
        })),
      },
      planStore: makePlanStore('DBT_MODEL', planId),
      resolveWorkspaceRoot: () => workspaceRoot,
      dbtBundleStore: {
        kind: 's3' as const,
        bucket: 'dbt-bundles',
      },
    });

    const result = await useCase.execute(
      {
        ...buildCommand(),
        planRef: parsePlanRef({
          uri: 'dvt-plan://postgres/dbt-plan-3',
          sha256: 'd'.repeat(64),
          schemaVersion: '1.0',
          planId,
          planVersion: '1.0',
        }),
      },
      buildContext()
    );

    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        code: 'REJECTED',
        reason: 'dbt project bundle artifact auto-binding requires a file artifact store',
        cause: 'run_execution_context',
      },
    });
  });
});

async function makeTempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

async function writeWorkspaceFiles(workspaceRoot: string): Promise<void> {
  await writeFile(join(workspaceRoot, 'dbt_project.yml'), 'name: canvas_dbt\nversion: "1.0"\n');
  await mkdir(join(workspaceRoot, 'models'), { recursive: true });
  await writeFile(
    join(workspaceRoot, 'models', 'model_1.sql'),
    "{{ config(materialized='view') }}\n\nselect * from {{ source('source_1', 'source_1') }}\n"
  );
}

function makePlanStore(
  stepKind: string | undefined,
  planId: string
): {
  fetchStoredPlanArtifactForValidation: ReturnType<typeof vi.fn>;
} {
  return {
    fetchStoredPlanArtifactForValidation: vi.fn(async () => ({
      executionPolicy: {},
      bytes: Buffer.from(
        JSON.stringify({
          metadata: {
            planId,
            planVersion: '1.0',
            schemaVersion: '1.0',
            contractVersion: '1.0.0',
            inputHashSha256: '1'.repeat(64),
            createdAtIso: '2026-05-26T00:00:00.000Z',
          },
          steps:
            stepKind === undefined
              ? []
              : [{ stepId: 'model_1', kind: stepKind, dependsOn: [], stepTypeConfig: {} }],
        }),
        'utf8'
      ),
    })),
  };
}

function buildCommand(): StartRunCommand {
  return {
    runId: 'run-test-1',
    targetAdapter: 'temporal',
    selection: parseExecutionSelection({ mode: 'explicit', nodeIds: ['model_1'] }),
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
    authorizedAt: new Date('2026-05-26T00:00:00.000Z'),
  };
}
