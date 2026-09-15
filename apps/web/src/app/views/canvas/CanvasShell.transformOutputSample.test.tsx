// @vitest-environment jsdom

/** Owned concern: prove Transform single-click semantics and double-click authoritative rows. */
import { DvtPostgresPublicationEvidenceSchema, PlanRefSchema } from '@dvt/contracts';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';

describe('CanvasShell Transform output sample', () => {
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<unknown>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => unmountShell());

  it('keeps single-click semantic and loads exact published rows on double-click', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'postgresql-local',
      provider: 'postgres' as const,
    };
    const source = {
      ...fixture.sources[0],
      metadata: {
        ...fixture.sources[0].metadata,
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1' as const,
          connectionRef,
          sourceObjectId: 'relation/dvt/raw/orders',
        },
      },
    };
    const transform = {
      ...fixture.transform,
      metadata: {
        ...fixture.transform.metadata,
        config: {
          ...((fixture.transform.metadata?.config as Record<string, unknown> | undefined) ?? {}),
          resultTarget: {
            schemaVersion: 'dvt-transform-result-target.v1' as const,
            connectionRef,
            schema: 'analytics',
            relation: 'orders_enriched',
          },
        },
      },
    };
    const authoring = createDvtNodeAuthoringMetadata(transform);
    if (authoring?.kind !== 'transform' || authoring.mode !== 'substrait') {
      throw new Error('Expected a Substrait Transform fixture.');
    }
    const planRef = PlanRefSchema.parse({
      schemaVersion: 'plan-ref.v1',
      planId: 'plan-1',
      planVersion: '1.0',
      uri: 'artifact://plans/plan-1/1.0',
      sha256: 'a'.repeat(64),
    });
    const publication = DvtPostgresPublicationEvidenceSchema.parse({
      evidenceType: 'dvt-postgres-publication',
      environmentId: 'dev',
      plan: { planId: 'plan-1', planVersion: '1.0', sha256: planRef.sha256 },
      workloadSha256: 'b'.repeat(64),
      semanticPlanSha256: authoring.sidecar.semanticPlanSha256,
      projection: {
        profileId: 'dvt.vtx2.postgres.project-rel.v1',
        toolIdentity: 'pgsql-deparser@16.1.1',
        schemaDigestSha256: 'd'.repeat(64),
        sqlArtifact: {
          storageUri: `cas://sha256/${'e'.repeat(64)}`,
          sha256: 'e'.repeat(64),
          sizeBytes: 128,
        },
      },
      target: { connectionRef, schema: 'analytics', relation: 'orders_enriched' },
      publication: {
        token: 'f'.repeat(64),
        predecessorToken: null,
        outcome: 'created',
      },
      rowsWritten: 1,
      startedAt: '2026-09-15T10:00:01.000Z',
      completedAt: '2026-09-15T10:00:02.000Z',
      durationMs: 1000,
    });
    const previewSourceObjectRows = vi.fn().mockResolvedValue({
      contractVersion: 1,
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/analytics/orders_enriched',
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-15T10:00:03.000Z',
    });

    await renderShell({
      panels: { inspectorGraphNodes: [source, transform] },
      graph: {
        nodesWithImpact: [
          {
            id: transform.id,
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: { ...transform, pluginKind: transform.kind },
          },
        ],
      },
      warehouseSourceDataSampleQuery: { previewSourceObjectRows },
      runOutputPreviewAuthority: {
        currentPlan: {
          planId: 'plan-1',
          planVersion: '1.0',
          planRef,
          generatedAt: '2026-09-15T10:00:00.000Z',
          adapter: 'postgres',
          target: 'postgresql-local',
          steps: [],
          capabilities: [],
        },
        isCurrentPlanStale: false,
      },
      runSnapshot: { runId: 'run-1', status: 'completed', publication },
    });
    const node = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{ data: DbtNodeData }>
    )[0]!.data;

    act(() => node.onSelectNode?.(transform.id));
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('semantic');
    expect(previewSourceObjectRows).not.toHaveBeenCalled();

    await act(async () => {
      node.onOpenNode?.(transform.id);
      await Promise.resolve();
    });

    expect(previewSourceObjectRows).toHaveBeenCalledWith({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/analytics/orders_enriched',
      expectedPublicationToken: publication.publication.token,
      limit: 20,
    });
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: 'data',
      contribution: {
        dataSample: { status: 'ready', nodeName: transform.name },
      },
    });
  });
});
