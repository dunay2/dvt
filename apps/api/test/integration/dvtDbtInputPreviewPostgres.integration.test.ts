import { createRequire } from 'node:module';

import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  TransformDataSampleRequestSchema,
  type TransformDataSampleRequest,
} from '@dvt/contracts';
import { PlannerFacade } from '@dvt/planner';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../src/application/ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../../src/application/ports/authContract.js';
import { PreviewCanvasTransformRowsUseCase } from '../../src/application/services/previewCanvasTransformRowsUseCase.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { TenantId, ProjectId, EnvironmentId } from '../../src/domain/auth/types.js';
import { PostgresCanvasTransformDataSampleProbe } from '../../src/infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.js';
import { buildDbtInputPreviewFixture } from '../fixtures/dvtDbtInputPreviewFixture.js';

type Lease = Readonly<{ url: string; dispose(): Promise<void> }>;
const { allocateDisposablePostgresDatabase } = createRequire(import.meta.url)(
  '../../../../scripts/disposable-postgres-database.cjs'
) as {
  allocateDisposablePostgresDatabase(url: string, label: string): Promise<Lease>;
};
const adminUrl = process.env['DVT_PG_URL'];
const context: AuthorizedExecutionContext = {
  principal: {
    principalId: 'preview-test',
    subjectId: 'preview-test',
    issuer: 'test',
    audience: 'test',
    principalType: 'user',
    expiresAt: new Date('2030-01-01'),
    rawScopes: [],
    assertedTenantIds: ['tenant'],
    assertedProjectIds: ['project'],
  },
  scope: buildEnvironmentAccessScope(
    TenantId.unsafe('tenant'),
    ProjectId.unsafe('project'),
    EnvironmentId.unsafe('env')
  ),
  action: AUTHORIZATION_ACTION.workspaceGraphDraftView,
  requestId: 'selected-dbt-read-native',
  authorizedAt: new Date('2026-11-07'),
};

describe.skipIf(adminUrl === undefined)(
  'mixed resolved dbt publication and physical-source samples on PostgreSQL',
  () => {
    let lease: Lease | undefined;
    beforeAll(async () => {
      if (adminUrl === undefined) throw new Error('DVT_PG_URL required for native proof.');
      lease = await allocateDisposablePostgresDatabase(adminUrl, 'dbt_input_3747');
      const setup = new Client({ connectionString: lease.url });
      await setup.connect();
      try {
        await setup.query(`CREATE SCHEMA raw;
        CREATE TABLE raw.orders(order_id text, client_id text);
        CREATE TABLE raw.client(client_id text, country text);
        INSERT INTO raw.orders VALUES ('O-1','C-1'),('O-2','C-2'),('O-3','missing');
        INSERT INTO raw.client VALUES ('C-1','ES'),('C-2','US'),('C-2','US'),(NULL,'GB')`);
      } finally {
        await setup.end();
      }
    });
    afterAll(async () => {
      await lease?.dispose();
    });

    function harness(fixture: ReturnType<typeof buildDbtInputPreviewFixture>): {
      useCase: PreviewCanvasTransformRowsUseCase;
      request: TransformDataSampleRequest;
      resolveCredential: ReturnType<typeof vi.fn>;
    } {
      const resolveCredential = vi.fn(async (reference: string) => {
        if (reference !== 'test:owned-db') throw new Error('Unexpected credential reference.');
        return lease!.url;
      });
      const useCase = new PreviewCanvasTransformRowsUseCase({
        graphDraftResolver: new ResolveAuthorizedExecutableSubgraphService({
          planner: new PlannerFacade(),
          workspaceGraphDraftStore: {
            read: async () => ({
              schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
              revision: 'saved-native',
              draftPayload: fixture.draft,
            }),
          } as never,
        }),
        modelProducers: { resolve: async () => fixture.externalProducers },
        connectionCatalog: {
          getConnection: async () => ({
            id: 'local-postgres-proof',
            name: 'Owned test database',
            type: 'postgres',
            database: 'owned-test-db',
            credentialRef: 'test:owned-db',
            sourceObjects: [],
          }),
        },
        probe: new PostgresCanvasTransformDataSampleProbe({
          credentialResolver: { resolveCredential },
          now: () => new Date(),
        }),
      });
      const request = TransformDataSampleRequestSchema.parse({
        canvasId: fixture.draft.canvas.id!,
        transformNodeId: fixture.targetId,
        semanticPlanSha256: fixture.semanticPlanSha256,
        limit: 20,
      });
      return { useCase, request, resolveCredential };
    }

    it.each(['model', 'physical', 'join', 'whole'] as const)(
      'returns actual rows for %s without widening the selected projection',
      async (selection) => {
        const fixture = buildDbtInputPreviewFixture();
        const before = globalThis.structuredClone(fixture.draft);
        const h = harness(fixture);
        const relationId = {
          model: fixture.modelRelationId,
          physical: fixture.physicalRelationId,
          join: fixture.joinRelationId,
          whole: undefined,
        }[selection];
        const sample = await h.useCase.execute(
          { ...h.request, ...(relationId == null ? {} : { relationId }) },
          context
        );
        const expected =
          selection === 'model'
            ? [
                ['O-1', 'C-1'],
                ['O-2', 'C-2'],
                ['O-3', 'missing'],
              ]
            : selection === 'physical'
              ? [
                  ['C-1', 'ES'],
                  ['C-2', 'US'],
                  ['C-2', 'US'],
                  [null, 'GB'],
                ]
              : [
                  ['O-1', 'C-1', 'C-1', 'ES'],
                  ['O-2', 'C-2', 'C-2', 'US'],
                  ['O-2', 'C-2', 'C-2', 'US'],
                ];
        expect(sample.rows.map((row) => JSON.stringify(row.values)).sort()).toEqual(
          expected.map((row) => JSON.stringify(row)).sort()
        );
        expect(sample.columns.map((column) => column.name)).toEqual(
          selection === 'model'
            ? ['order_id', 'client_id']
            : selection === 'physical'
              ? ['client_id', 'country']
              : ['order_id', 'client_id', 'client_client_id', 'country']
        );
        expect(sample.provenance.sourceRefs).toHaveLength(selection === 'model' ? 0 : 1);
        expect(sample.relationId).toBe(relationId);
        expect(sample.draftRevision).toBe('saved-native');
        expect(sample.semanticPlanSha256).toBe(fixture.semanticPlanSha256);
        expect(h.resolveCredential).toHaveBeenCalledOnce();
        expect(fixture.draft).toEqual(before);
      }
    );

    it.each([
      'unknown source',
      'wrong table',
      'ambiguous source',
      'missing producer',
      'mixed connection',
    ] as const)('rejects %s before acquiring credentials', async (reason) => {
      const fixture = buildDbtInputPreviewFixture();
      const physical = fixture.draft.nodes.find(
        (node) => node.metadata?.connectedSourceRef != null
      )!;
      if (reason === 'unknown source')
        physical.metadata!.connectedSourceRef = {
          ...(physical.metadata!.connectedSourceRef as object),
          sourceObjectId: 'foreign',
        };
      if (reason === 'wrong table') physical.metadata!.tableName = 'another_table';
      if (reason === 'ambiguous source') {
        const extra = { ...globalThis.structuredClone(physical), id: 'another-definition' };
        fixture.draft.nodes.push(extra);
        fixture.draft.nodeIds.push(extra.id);
        fixture.draft.nodePositions[extra.id] = { x: 0, y: 100 };
        fixture.draft.edges.push({
          id: 'extra',
          sourceId: extra.id,
          targetId: fixture.targetId,
          relation: 'lineage',
        });
      }
      if (reason === 'missing producer') fixture.externalProducers = new Map();
      if (reason === 'mixed connection')
        fixture.externalProducers = new Map(
          [...fixture.externalProducers].map(([id, producer]) => [
            id,
            { ...producer, connection: { ...producer.connection, connectionId: 'foreign' } },
          ])
        );
      const h = harness(fixture);
      await expect(h.useCase.execute(h.request, context)).rejects.toMatchObject({
        reason: 'projection_unsupported',
      });
      expect(h.resolveCredential).not.toHaveBeenCalled();
    });
  }
);
