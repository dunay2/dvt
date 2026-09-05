import {
  ImportSourceObjectsResultV2Schema,
  type ImportSourceObjectsResultV2,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { resolveDbtProjectFileSourceImportFocus } from './useDbtProjectFilesAuthorityController';

const AUTHORITY_BINDING = {
  schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
  canvasId: 'warehouse-analytics',
  authority: {
    kind: 'dbt-project-files' as const,
    projectRoot: 'analytics',
  },
};

function buildFileImportResult(canvasId = AUTHORITY_BINDING.canvasId): ImportSourceObjectsResultV2 {
  return ImportSourceObjectsResultV2Schema.parse({
    schemaVersion: 'source-import-result.v2',
    success: true,
    idempotencyKey: 'source-import:warehouse-analytics:1',
    authorityBinding: {
      ...AUTHORITY_BINDING,
      canvasId,
    },
    sourcesCreated: 1,
    objectsImported: 2,
    yamlFiles: ['analytics/models/sources/src_warehouse.yml'],
    grouping: 'schema',
    options: {
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    },
    outcome: {
      kind: 'dbt-project-files',
      projectRevision: {
        projectRoot: 'analytics',
        contentSetSha256: '1'.repeat(64),
        analyzedAt: '2026-07-15T10:00:00.000Z',
        analyzerVersion: 'dbt-cli-v1',
      },
      analysisSha256: '2'.repeat(64),
      projectedSourceUniqueIds: ['source.warehouse.orders', 'source.warehouse.customers'],
    },
  });
}

describe('file-authoritative dbt source import completion', () => {
  it('focuses the server-projected source identities for the active authority', () => {
    expect(
      resolveDbtProjectFileSourceImportFocus(AUTHORITY_BINDING, buildFileImportResult())
    ).toEqual(['source.warehouse.orders', 'source.warehouse.customers']);
  });

  it('ignores a late result for another Canvas instead of contaminating the active projection', () => {
    expect(
      resolveDbtProjectFileSourceImportFocus(
        AUTHORITY_BINDING,
        buildFileImportResult('another-canvas')
      )
    ).toBeNull();
  });
});
