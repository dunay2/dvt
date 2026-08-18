import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { DbtYamlDescriptionResourceUnsupportedError } from '../../../../src/application/ports/dbtYamlDescriptionEdit.js';
import { DbtYamlDescriptionResourceResolver } from '../../../../src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.js';

const SCOPE = { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' } as const;

describe('DbtYamlDescriptionResourceResolver', () => {
  it('resolves only an explicitly editable resource owned by the root dbt package', async () => {
    const execute = vi.fn().mockResolvedValue(projection());
    const resolver = new DbtYamlDescriptionResourceResolver({ projectGraph: { execute } });

    await expect(
      resolver.resolve({
        scope: SCOPE,
        canvasId: 'canvas-1',
        resourceUniqueId: 'model.analytics.orders',
      })
    ).resolves.toEqual({
      resource: {
        uniqueId: 'model.analytics.orders',
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
      },
      path: 'analytics/models/schema.yml',
    });
  });

  it('rejects a dependency package even when its manifest path looks local', async () => {
    const resolver = new DbtYamlDescriptionResourceResolver({
      projectGraph: { execute: vi.fn().mockResolvedValue(projection()) },
    });

    await expect(
      resolver.resolve({
        scope: SCOPE,
        canvasId: 'canvas-1',
        resourceUniqueId: 'model.dbt_utils.orders',
      })
    ).rejects.toBeInstanceOf(DbtYamlDescriptionResourceUnsupportedError);
  });
});

function projection(): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas-1',
      authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
    },
    freshness: 'fresh',
    projectRevision: {
      projectRoot: 'analytics',
      projectName: 'analytics',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: '2026-07-17T10:00:00.000Z',
      analyzerVersion: 'test',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'b'.repeat(64),
    adapterType: 'postgres',
    nodes: [
      {
        uniqueId: 'model.analytics.orders',
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
        originalFilePath: 'models/orders.sql',
        descriptionFilePath: 'models/schema.yml',
        columns: [],
        tags: [],
        visualEditability: {
          status: 'partially_editable',
          operations: ['yaml_description'],
          reasons: ['yaml_description_edit'],
        },
      },
      {
        uniqueId: 'model.dbt_utils.orders',
        resourceType: 'model',
        name: 'orders',
        packageName: 'dbt_utils',
        originalFilePath: 'models/orders.sql',
        descriptionFilePath: 'models/schema.yml',
        columns: [],
        tags: [],
        visualEditability: { status: 'code_only', reasons: ['external_package'] },
      },
    ],
    edges: [],
    diagnostics: [],
    executionTarget: {
      provider: 'temporal',
      adapter: 'postgres',
      targetName: 'dev',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-dev',
        provider: 'postgres',
      },
      resolutionSource: 'environment-default',
      credentialRef: 'env:DBT_PROFILES_DIR',
    },
    capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 1 },
  });
}
