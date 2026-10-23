import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { UseCanvasExecutionActionsParams } from './canvasExecutionActions.types';
import type { CanvasPlanExecution } from './canvasPlanAction';
import { bindCanvasPlanExecution } from './useCanvasPlanActionHandler';

type PublicationPorts = Pick<
  UseCanvasExecutionActionsParams,
  | 'workspaceFilesQuery'
  | 'graphDbtWorkspaceArtifactPublicationCommand'
  | 'graphDbtModelCompilationQuery'
>;

const publicationPorts: PublicationPorts = {
  workspaceFilesQuery: { listFiles: vi.fn(), getFileContent: vi.fn() },
  graphDbtWorkspaceArtifactPublicationCommand: { publish: vi.fn() },
  graphDbtModelCompilationQuery: { compile: vi.fn() },
};

const fileStrategy: Extract<CanvasExecutionStrategy, { kind: 'dbt_project_file_preview' }> = {
  kind: 'dbt_project_file_preview',
  previewProfile: 'planner-generic-v1',
  sourceFamily: 'dbt',
  canvasId: 'analytics',
  projectRoot: 'analytics',
  contentSetSha256: '1'.repeat(64),
  analysisSha256: '2'.repeat(64),
  dbtVersion: '1.10.0',
  plannerGraphSource: {
    kind: 'generic-graph-v1',
    sourceFamily: 'dbt',
    sourceVersion: '1.0',
    nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
  },
  executionTarget: {
    provider: 'server-config',
    adapter: 'postgres',
    targetName: 'development',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse',
      provider: 'postgres',
    },
    resolutionSource: 'environment-default',
    credentialRef: 'vault:dbt/development',
  },
};

const EXECUTION_ACTIONS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasExecutionActions.ts'
);

describe('useCanvasExecutionActions architecture', () => {
  it.each([
    {
      kind: 'dvt_protected_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dvt',
    } as const,
    fileStrategy,
    { kind: 'not_executable' } as const,
    null,
  ])('does not read publication dependencies when binding %j', (strategy) => {
    const forbiddenPorts = new Proxy(publicationPorts, {
      get() {
        throw new Error('This strategy must not read publication capabilities.');
      },
    });
    expect(bindCanvasPlanExecution(strategy, forbiddenPorts)).toBe(strategy);
  });

  it('binds exactly the existing publication ports to generic Preview', () => {
    const strategy = {
      kind: 'planner_generic_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
    } as const;
    const execution = bindCanvasPlanExecution(strategy, publicationPorts);
    expect(execution).toEqual({ ...strategy, ...publicationPorts });
    expect(execution).not.toBe(strategy);
  });

  it('requires publication capabilities only on the generic strategy type', () => {
    type Generic = Extract<CanvasPlanExecution, { kind: 'planner_generic_preview' }>;
    type Protected = Extract<CanvasPlanExecution, { kind: 'dvt_protected_preview' }>;
    type File = Extract<CanvasPlanExecution, { kind: 'dbt_project_file_preview' }>;
    expectTypeOf<Generic>().toMatchTypeOf<PublicationPorts>();
    expectTypeOf<Protected>().toEqualTypeOf<
      Extract<CanvasExecutionStrategy, { kind: 'dvt_protected_preview' }>
    >();
    expectTypeOf<File>().toEqualTypeOf<typeof fileStrategy>();
    expectTypeOf<Protected>().not.toHaveProperty('workspaceFilesQuery');
    expectTypeOf<File>().not.toHaveProperty('graphDbtWorkspaceArtifactPublicationCommand');
    expectTypeOf<File>().not.toHaveProperty('graphDbtModelCompilationQuery');
  });

  it('stays a composition seam over dedicated plan and run handlers', () => {
    expect(EXECUTION_ACTIONS_SOURCE).toContain("'./useCanvasPlanActionHandler'");
    expect(EXECUTION_ACTIONS_SOURCE).toContain("'./useCanvasRunStartHandler'");
    expect(EXECUTION_ACTIONS_SOURCE).not.toContain('executeCanvasPlanAction');
    expect(EXECUTION_ACTIONS_SOURCE).not.toContain('executeCanvasRunStartAction');
  });
});
