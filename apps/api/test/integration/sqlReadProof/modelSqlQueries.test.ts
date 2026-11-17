/** Exercise context → source proposal → canonical projection → native read-only rows as one story. */
import { createRequire } from 'node:module';

import { isSchemaTypeNullable } from '@dvt/substrait-analysis';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

import { CompileCanvasModelSqlQuery } from '../../../src/application/services/compileCanvasModelSqlQuery.js';
import { PrepareCanvasSqlDraftProjection } from '../../../src/application/services/prepareCanvasSqlDraftProjection.js';
import { PreviewCanvasTransformRowsUseCase } from '../../../src/application/services/previewCanvasTransformRowsUseCase.js';
import { PostgresCanvasTransformDataSampleProbe } from '../../../src/infrastructure/postgres/PostgresCanvasTransformDataSampleProbe.js';
import {
  modelSqlHarness,
  sqlAuth,
  sqlTarget,
} from '../../application/services/canvasModelSql.fixtures.js';

import {
  createModelSqlSourceFixtures,
  modelSqlSourceDatasets,
  seedModelSqlSourceFixtures,
} from './modelSqlSource.fixtures.js';

type Lease = Readonly<{ url: string; dispose(): Promise<void> }>;
const { allocateDisposablePostgresDatabase } = createRequire(import.meta.url)(
  '../../../../../scripts/disposable-postgres-database.cjs'
) as {
  allocateDisposablePostgresDatabase(url: string, label: string): Promise<Lease>;
};
const adminUrl = process.env['DVT_PG_URL'];

describe.skipIf(adminUrl === undefined)('Model SQL application native PostgreSQL rows', () => {
  it('queries exact native rows and truncation without changing the incomplete saved Model', async () => {
    if (adminUrl === undefined)
      throw new Error('DVT_PG_URL is required for the native Model SQL application proof.');
    const lease = await allocateDisposablePostgresDatabase(adminUrl, 'model_query_3944');
    const client = new Client({ connectionString: lease.url, query_timeout: 3000 });
    try {
      await client.connect();
      const source = await createModelSqlSourceFixtures(client);
      await seedModelSqlSourceFixtures(client, modelSqlSourceDatasets[1]);
      const h = modelSqlHarness();
      const target = h.draft.nodes.find((node) => node.id === sqlTarget.transformNodeId)!;
      h.draft.nodes = [
        ...source.inputs.map((input) => {
          if (!('sourceRef' in input.source))
            throw new Error('Expected native physical fixture authority.');
          return {
            id: input.nodeId,
            name: input.sqlName,
            kind: 'dvt:source',
            pluginId: 'dvt.warehouse-source',
            role: 'input' as const,
            status: 'idle' as const,
            tags: [],
            metadata: {
              schema: input.source.names[0],
              tableName: input.source.names[1],
              connectedSourceRef: input.source.sourceRef,
              columns: input.columns.map((column) => ({
                name: column.name,
                type: column.type.kind.case,
                nullable: isSchemaTypeNullable(column.type),
              })),
            },
          };
        }),
        target,
      ];
      h.draft.nodeIds = h.draft.nodes.map((node) => node.id);
      h.draft.nodePositions = Object.fromEntries(
        h.draft.nodes.map((node, ordinal) => [node.id, { x: ordinal * 200, y: 0 }])
      );
      h.draft.edges = source.inputs.map((input) => ({
        id: `${input.nodeId}-target`,
        sourceId: input.nodeId,
        targetId: target.id,
        relation: 'lineage',
      }));
      const context = await h.query.execute(sqlTarget, sqlAuth);
      const compilation = new CompileCanvasModelSqlQuery(h.query);
      const rows = new PreviewCanvasTransformRowsUseCase({
        projection: h.projection,
        sqlDraftProjection: new PrepareCanvasSqlDraftProjection(compilation),
        connectionCatalog: {
          getConnection: async () => ({
            id: 'source-oracle',
            name: 'Native oracle',
            type: 'postgres',
            database: decodeURIComponent(new globalThis.URL(lease.url).pathname.slice(1)),
            credentialRef: 'postgres:oracle',
            sourceObjects: [],
          }),
        },
        probe: new PostgresCanvasTransformDataSampleProbe({
          credentialResolver: { resolveCredential: async () => lease.url },
          now: () => new Date('2026-11-17T00:00:00.000Z'),
        }),
      });
      const before = JSON.stringify(h.record.draftPayload);
      const result = await rows.executeSqlDraft(
        {
          schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
          ...sqlTarget,
          draftRevision: context.draftRevision,
          contextSha256: context.contextSha256,
          limit: 2,
          sql: 'SELECT c.client_id, c.country, o.order_id FROM client c LEFT JOIN orders o ON c.client_id = o.client_id ORDER BY c.client_id, o.order_id LIMIT 3',
        },
        sqlAuth
      );
      expect(result.sample.columns.map((column) => column.name)).toEqual([
        'client_id',
        'country',
        'order_id',
      ]);
      expect(result.sample.rows).toEqual([
        { values: ['a', 'ES', '1'] },
        { values: ['a', 'ES', '1'] },
      ]);
      expect(result.sample.truncated).toBe(true);
      expect(result.sample.provenance.navigation).toBe('bounded-first-page');
      expect(JSON.stringify(h.record.draftPayload)).toBe(before);
      expect(h.projection.execute).not.toHaveBeenCalled();
    } finally {
      try {
        await client.end();
      } finally {
        await lease.dispose();
      }
    }
  });
});
