import { describe, expect, it } from 'vitest';

import {
  ImportSourceObjectsRequestV2Schema,
  ImportSourceObjectsResultV2Schema,
} from '../../src/contracts/source-import/SourceImportOperations.v2.js';

const REQUEST = {
  schemaVersion: 'source-import-request.v2',
  canvasId: 'canvas-orders',
  idempotencyKey: 'source-import-orders-1',
  connectionId: 'warehouse-prod',
  objects: [{ objectId: 'relation/analytics/public/orders' }],
  groupingStrategy: 'schema',
  includeColumns: true,
  addTests: false,
  addFreshness: false,
} as const;

const RESULT_BASE = {
  schemaVersion: 'source-import-result.v2',
  success: true,
  idempotencyKey: 'source-import-orders-1',
  sourcesCreated: 1,
  objectsImported: 1,
  yamlFiles: ['models/sources/public.yml'],
  grouping: 'schema',
  options: {
    includeColumns: true,
    addTests: false,
    addFreshness: false,
  },
} as const;

describe('SourceImportOperations.v2', () => {
  it('requires a Canvas and idempotency key without accepting client authority', () => {
    expect(ImportSourceObjectsRequestV2Schema.parse(REQUEST)).toEqual(REQUEST);
    expect(
      ImportSourceObjectsRequestV2Schema.safeParse({
        ...REQUEST,
        authorityBinding: { authority: { kind: 'graph-draft' } },
      }).success
    ).toBe(false);
    expect(ImportSourceObjectsRequestV2Schema.safeParse({ ...REQUEST, canvasId: '' }).success).toBe(
      false
    );
  });

  it('accepts one exact existing dbt source target for every selected object', () => {
    const request = {
      ...REQUEST,
      existingDbtSourceTargets: [
        {
          objectId: 'relation/analytics/public/orders',
          sourceUniqueId: 'source.orders.raw.orders',
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'orders',
        },
      ],
    } as const;

    expect(ImportSourceObjectsRequestV2Schema.parse(request)).toEqual(request);
    expect(
      ImportSourceObjectsRequestV2Schema.safeParse({
        ...request,
        existingDbtSourceTargets: [
          { ...request.existingDbtSourceTargets[0], objectId: 'relation/analytics/public/missing' },
        ],
      }).success
    ).toBe(false);
    expect(
      ImportSourceObjectsRequestV2Schema.safeParse({
        ...request,
        existingDbtSourceTargets: [
          request.existingDbtSourceTargets[0],
          request.existingDbtSourceTargets[0],
        ],
      }).success
    ).toBe(false);
  });

  it('accepts a graph-draft outcome with draft identifiers', () => {
    const result = {
      ...RESULT_BASE,
      authorityBinding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'canvas-orders',
        authority: { kind: 'graph-draft' },
      },
      outcome: {
        kind: 'graph-draft',
        draftRevision: 'draft-revision-2',
        importedNodeIds: ['source-orders'],
      },
    } as const;

    expect(ImportSourceObjectsResultV2Schema.parse(result)).toEqual(result);
  });

  it('accepts a file-backed outcome with refreshed projection evidence', () => {
    const result = {
      ...RESULT_BASE,
      yamlFiles: ['analytics/orders/models/sources/public.yml'],
      authorityBinding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'canvas-orders',
        authority: { kind: 'dbt-project-files', projectRoot: 'analytics/orders' },
      },
      outcome: {
        kind: 'dbt-project-files',
        projectRevision: {
          projectRoot: 'analytics/orders',
          contentSetSha256: 'a'.repeat(64),
          analyzedAt: '2026-07-14T10:01:00.000Z',
          analyzerVersion: 'dvt-dbt-analyzer.v1',
        },
        analysisSha256: 'b'.repeat(64),
        projectedSourceUniqueIds: ['source.orders.public.orders'],
      },
    } as const;

    expect(ImportSourceObjectsResultV2Schema.parse(result)).toEqual(result);
  });

  it('rejects outcomes that disagree with the persisted authority', () => {
    expect(
      ImportSourceObjectsResultV2Schema.safeParse({
        ...RESULT_BASE,
        authorityBinding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: 'canvas-orders',
          authority: { kind: 'graph-draft' },
        },
        outcome: {
          kind: 'dbt-project-files',
          projectRevision: {
            projectRoot: 'analytics/orders',
            contentSetSha256: 'a'.repeat(64),
            analyzedAt: '2026-07-14T10:01:00.000Z',
            analyzerVersion: 'dvt-dbt-analyzer.v1',
          },
          analysisSha256: 'b'.repeat(64),
          projectedSourceUniqueIds: ['source.orders.public.orders'],
        },
      }).success
    ).toBe(false);
  });

  it('rejects file-backed YAML evidence outside the bound project root', () => {
    expect(
      ImportSourceObjectsResultV2Schema.safeParse({
        ...RESULT_BASE,
        yamlFiles: ['models/sources/public.yml'],
        authorityBinding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: 'canvas-orders',
          authority: { kind: 'dbt-project-files', projectRoot: 'analytics/orders' },
        },
        outcome: {
          kind: 'dbt-project-files',
          projectRevision: {
            projectRoot: 'analytics/orders',
            contentSetSha256: 'a'.repeat(64),
            analyzedAt: '2026-07-14T10:01:00.000Z',
            analyzerVersion: 'dvt-dbt-analyzer.v1',
          },
          analysisSha256: 'b'.repeat(64),
          projectedSourceUniqueIds: ['source.orders.public.orders'],
        },
      }).success
    ).toBe(false);
  });
});
