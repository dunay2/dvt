/** Owned concern: prove current file authority and compilation precede planner and persistence admission. */
import { asSha256HexString, parseExecutionSelection } from '@dvt/contracts';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { PreviewPlanUseCase } from '../../../src/application/services/PreviewPlanUseCase.js';
import type { ResolveAuthorizedPreviewSelectionService } from '../../../src/application/services/resolveAuthorizedPreviewSelection.js';

import {
  MODEL_ID,
  GRAPH_SOURCE,
  PROVENANCE,
  buildContext,
  buildProjection,
  buildService,
} from './resolveAuthorizedPreviewSelection.fixtures.js';

const FILE_INPUT = {
  selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [MODEL_ID] }),
  graphSource: GRAPH_SOURCE,
  provenance: PROVENANCE,
};

function forbidPlanningAndPersistence(service: ResolveAuthorizedPreviewSelectionService): {
  readonly plan: Mock<() => never>;
  readonly persist: Mock<() => never>;
  readonly useCase: PreviewPlanUseCase;
} {
  const plan = vi.fn((): never => {
    throw new Error('Rejected selection reached planner.');
  });
  const persist = vi.fn((): never => {
    throw new Error('Rejected selection reached plan storage.');
  });
  const useCase = new PreviewPlanUseCase({
    previewSelectionResolver: service,
    planner: { buildPlan: plan, deriveExecutableSubgraph: plan },
    planStore: {
      storePlanArtifact: persist,
      markStoredPlanArtifactValid: persist,
      markStoredPlanArtifactInvalid: persist,
      getStoredPlanValidationRecord: persist,
      getPlanRecordByRef: persist,
    },
    planValidator: { materializeAndValidatePlan: persist },
  });
  return { plan, persist, useCase };
}

async function expectNoAdmission(
  service: ResolveAuthorizedPreviewSelectionService,
  cause: string
): Promise<void> {
  const { plan, persist, useCase } = forbidPlanningAndPersistence(service);
  await expect(
    useCase.execute({ ...FILE_INPUT, targetAdapter: 'temporal' }, buildContext())
  ).resolves.toMatchObject({
    kind: 'selection-rejected',
    rejection: { cause },
  });
  expect(plan).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
}

describe('ResolveAuthorizedPreviewSelectionService file admission', () => {
  it('does not admit a file plan when native compilation fails', async () => {
    const { service, dbtCompilation } = buildService();
    dbtCompilation.execute.mockResolvedValue({ ok: false, reason: 'Compilation failed.' });
    await expectNoAdmission(service, 'dbt_project_compilation_required');
  });

  it('rejects a connection-only target change before admitting a dbt Preview', async () => {
    const { service, dbtCompilation, projectGraph, graphDraftResolver, dvtPreview } = buildService(
      buildProjection({
        executionTarget: {
          ...PROVENANCE.executionTarget,
          connectionRef: {
            ...PROVENANCE.executionTarget.connectionRef,
            connectionId: 'warehouse-replaced',
          },
        },
      })
    );
    await expectNoAdmission(service, 'dbt_project_preview_provenance_stale');
    expect(projectGraph.execute).toHaveBeenCalledOnce();
    expect(dbtCompilation.execute).not.toHaveBeenCalled();
    expect(graphDraftResolver.execute).not.toHaveBeenCalled();
    expect(dvtPreview.execute).not.toHaveBeenCalled();
  });

  it.each(['revision', 'target', 'connection'] as const)(
    'rejects a %s changed during compilation',
    async (changed) => {
      const { service, projectGraph, dbtCompilation } = buildService();
      const projectRevision = { ...buildProjection().projectRevision };
      const executionTarget = { ...PROVENANCE.executionTarget };
      if (changed === 'revision')
        projectRevision.contentSetSha256 = asSha256HexString('f'.repeat(64));
      if (changed === 'target') executionTarget.targetName = 'different';
      if (changed === 'connection')
        executionTarget.connectionRef = {
          ...executionTarget.connectionRef,
          connectionId: 'different',
        };
      projectGraph.execute
        .mockResolvedValueOnce(buildProjection())
        .mockResolvedValue(buildProjection({ projectRevision, executionTarget }));
      await expectNoAdmission(service, 'dbt_project_preview_provenance_stale');
      expect(dbtCompilation.execute).toHaveBeenCalledOnce();
    }
  );

  it.each(['before', 'after'] as const)(
    'rejects unavailable authority %s compilation',
    async (stage) => {
      const { service, projectGraph, dbtCompilation } = buildService();
      if (stage === 'after') projectGraph.execute.mockResolvedValueOnce(buildProjection());
      projectGraph.execute.mockRejectedValue(new Error('Authority unavailable.'));
      await expectNoAdmission(service, 'dbt_project_preview_projection_unavailable');
      expect(dbtCompilation.execute).toHaveBeenCalledTimes(stage === 'before' ? 0 : 1);
    }
  );

  it('rejects stale dbt revision provenance before planner persistence', async () => {
    const { service, dbtCompilation } = buildService(
      buildProjection({
        projectRevision: { ...buildProjection().projectRevision, contentSetSha256: 'c'.repeat(64) },
      })
    );
    await expectNoAdmission(service, 'dbt_project_preview_provenance_stale');
    expect(dbtCompilation.execute).not.toHaveBeenCalled();
  });

  it('rejects browser graph semantics that differ from the authoritative dbt projection', async () => {
    const { service, dbtCompilation } = buildService();
    await expect(
      service.execute(
        {
          ...FILE_INPUT,
          graphSource: {
            ...GRAPH_SOURCE,
            nodes: [{ ...GRAPH_SOURCE.nodes[0]!, stepKind: 'DBT_SNAPSHOT' }],
          },
        },
        buildContext()
      )
    ).resolves.toMatchObject({
      ok: false,
      rejection: { cause: 'dbt_project_graph_source_mismatch' },
    });
    expect(dbtCompilation.execute).not.toHaveBeenCalled();
  });

  it('rejects a file-backed selection that names only a non-executable dbt resource', async () => {
    const { service, dbtCompilation } = buildService();
    const sourceId = 'source.analytics.raw.orders';
    await expect(
      service.execute(
        {
          ...FILE_INPUT,
          selection: parseExecutionSelection({ mode: 'explicit', nodeIds: [sourceId] }),
          provenance: { ...PROVENANCE, selectedUniqueIds: [sourceId] },
        },
        buildContext()
      )
    ).resolves.toMatchObject({
      ok: false,
      rejection: { cause: 'dbt_project_selected_resource_not_executable' },
    });
    expect(dbtCompilation.execute).not.toHaveBeenCalled();
  });
});
