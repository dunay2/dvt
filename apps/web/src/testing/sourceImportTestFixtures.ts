import type {
  ImportSourcesInput,
  ImportSourcesResult,
  SourceImportGrouping,
} from '../app/ports/workspace';

type SourceImportOptions = ImportSourcesResult['options'];

export function buildSourceImportCommandInput(
  overrides: Partial<ImportSourcesInput> = {}
): ImportSourcesInput {
  return {
    schemaVersion: 'source-import-request.v2',
    canvasId: 'canvas-orders',
    idempotencyKey: 'source-import:test-1',
    connectionId: 'warehouse-prod',
    objects: [{ objectId: 'relation/analytics/erp/orders' }],
    groupingStrategy: 'schema',
    includeColumns: true,
    addTests: false,
    addFreshness: false,
    ...overrides,
  };
}

export function buildGraphDraftSourceImportResult(
  overrides: Readonly<{
    canvasId?: string;
    idempotencyKey?: string;
    draftRevision?: string;
    importedNodeIds?: readonly string[];
    sourcesCreated?: number;
    objectsImported?: number;
    yamlFiles?: readonly string[];
    grouping?: SourceImportGrouping;
    options?: SourceImportOptions;
  }> = {}
): ImportSourcesResult {
  const canvasId = overrides.canvasId ?? 'canvas-orders';

  return {
    schemaVersion: 'source-import-result.v2',
    success: true,
    idempotencyKey: overrides.idempotencyKey ?? 'source-import:test-1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId,
      authority: { kind: 'graph-draft' },
    },
    sourcesCreated: overrides.sourcesCreated ?? 1,
    objectsImported: overrides.objectsImported ?? 1,
    yamlFiles: [...(overrides.yamlFiles ?? ['models/sources/src_erp.yml'])],
    grouping: overrides.grouping ?? 'schema',
    options: overrides.options ?? {
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    },
    outcome: {
      kind: 'graph-draft',
      draftRevision: overrides.draftRevision ?? 'draft-revision-2',
      importedNodeIds: [...(overrides.importedNodeIds ?? ['src_erp_orders'])],
    },
  };
}
