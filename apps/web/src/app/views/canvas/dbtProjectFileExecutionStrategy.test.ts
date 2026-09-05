import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildDbtProjectFileExecutionDraftSignature,
  buildDbtProjectFilePlannerProjection,
  buildDbtProjectFileExecutionStrategy,
  buildDbtProjectFilePreviewProvenance,
  isDbtProjectFilePreviewProvenanceCurrent,
} from './dbtProjectFileExecutionStrategy';

function buildProjection(overrides: Record<string, unknown> = {}): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'analytics-canvas',
      authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
    },
    freshness: 'fresh',
    projectRevision: {
      projectRoot: 'analytics',
      projectName: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analyzedAt: '2026-07-15T10:00:00.000Z',
      analyzerVersion: 'dbt-cli-v1',
      dbtVersion: '1.10.0',
    },
    analysisSha256: '2'.repeat(64),
    adapterType: 'postgres',
    nodes: [
      {
        uniqueId: 'model.analytics.orders',
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
        originalFilePath: 'models/orders.sql',
        materialized: 'table',
        columns: [],
        tags: [],
        visualEditability: { status: 'editable', operations: ['edit-sql'] },
      },
    ],
    edges: [],
    diagnostics: [],
    executionTarget: {
      provider: 'server-config',
      adapter: 'postgres',
      targetName: 'development',
      credentialRef: 'vault:dbt/development',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-development',
        provider: 'postgres',
      },
      resolutionSource: 'environment-default',
    },
    capabilities: { canPreview: true, canRun: true, codeOnlyResourceCount: 0 },
    ...overrides,
  });
}

describe('dbt project file execution strategy', () => {
  it('binds planner preview to the analyzed revision and server-owned target', () => {
    expect(buildDbtProjectFileExecutionStrategy(buildProjection())).toEqual({
      kind: 'dbt_project_file_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
      canvasId: 'analytics-canvas',
      projectRoot: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analysisSha256: '2'.repeat(64),
      dbtVersion: '1.10.0',
      executionTarget: {
        provider: 'server-config',
        adapter: 'postgres',
        targetName: 'development',
        credentialRef: 'vault:dbt/development',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-development',
          provider: 'postgres',
        },
        resolutionSource: 'environment-default',
      },
      plannerGraphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: '1.0',
        nodes: [
          {
            nodeId: 'model.analytics.orders',
            stepKind: 'DBT_MODEL',
            dependsOn: [],
            metadata: {
              displayName: 'orders',
              tags: {
                kind: 'dvt:transform',
                pluginId: 'dvt',
                role: 'transform',
              },
            },
          },
        ],
      },
    });
  });

  it('fails closed when the projection does not advertise Preview', () => {
    const projection = buildProjection({
      freshness: 'invalid',
      capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 0 },
      executionTarget: undefined,
      adapterType: undefined,
    });

    expect(buildDbtProjectFileExecutionStrategy(projection)).toEqual({
      kind: 'not_executable',
    });
  });

  it('rejects an explicit selection that contains only non-executable project resources', () => {
    const strategy = buildDbtProjectFileExecutionStrategy(buildProjection());
    expect(strategy.kind).toBe('dbt_project_file_preview');
    if (strategy.kind !== 'dbt_project_file_preview') return;

    expect(
      buildDbtProjectFilePlannerProjection({
        strategy,
        selectionIntent: {
          mode: 'explicit',
          nodeIds: ['source.analytics.raw.orders'],
        },
        workspaceNodeIds: ['source.analytics.raw.orders', 'model.analytics.orders'],
      })
    ).toEqual({
      ok: false,
      cause: 'explicit_selection_contains_unavailable_or_non_executable_nodes',
      invalidNodeIds: ['source.analytics.raw.orders'],
    });
  });

  it('defaults to the executable workspace only when no project resource is selected', () => {
    const strategy = buildDbtProjectFileExecutionStrategy(buildProjection());
    expect(strategy.kind).toBe('dbt_project_file_preview');
    if (strategy.kind !== 'dbt_project_file_preview') return;

    expect(
      buildDbtProjectFilePlannerProjection({
        strategy,
        selectionIntent: { mode: 'workspace', nodeIds: [] },
        workspaceNodeIds: ['source.analytics.raw.orders', 'model.analytics.orders'],
      })
    ).toMatchObject({
      ok: true,
      selection: { mode: 'explicit', nodeIds: ['model.analytics.orders'] },
    });
  });

  it('rejects an explicitly empty selection instead of widening to the project workspace', () => {
    const strategy = buildDbtProjectFileExecutionStrategy(buildProjection());
    expect(strategy.kind).toBe('dbt_project_file_preview');
    if (strategy.kind !== 'dbt_project_file_preview') return;

    expect(
      buildDbtProjectFilePlannerProjection({
        strategy,
        selectionIntent: { mode: 'explicit', nodeIds: [] },
        workspaceNodeIds: ['model.analytics.orders'],
      })
    ).toEqual({
      ok: false,
      cause: 'explicit_selection_is_empty',
      invalidNodeIds: [],
    });
  });

  it('rejects an executable project resource that is unavailable in the visible workspace', () => {
    const strategy = buildDbtProjectFileExecutionStrategy(buildProjection());
    expect(strategy.kind).toBe('dbt_project_file_preview');
    if (strategy.kind !== 'dbt_project_file_preview') return;

    expect(
      buildDbtProjectFilePlannerProjection({
        strategy,
        selectionIntent: { mode: 'explicit', nodeIds: ['model.analytics.orders'] },
        workspaceNodeIds: ['source.analytics.raw.orders'],
      })
    ).toEqual({
      ok: false,
      cause: 'explicit_selection_contains_unavailable_or_non_executable_nodes',
      invalidNodeIds: ['model.analytics.orders'],
    });
  });

  it('sorts and deduplicates selected unique IDs in persisted provenance', () => {
    const strategy = buildDbtProjectFileExecutionStrategy(buildProjection());
    expect(strategy.kind).toBe('dbt_project_file_preview');
    if (strategy.kind !== 'dbt_project_file_preview') return;

    expect(
      buildDbtProjectFilePreviewProvenance(strategy, [
        'test.analytics.orders_not_null',
        'model.analytics.orders',
        'model.analytics.orders',
      ])
    ).toEqual({
      kind: 'dbt-project-files',
      canvasId: 'analytics-canvas',
      projectRoot: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analysisSha256: '2'.repeat(64),
      dbtVersion: '1.10.0',
      selectedUniqueIds: ['model.analytics.orders', 'test.analytics.orders_not_null'],
      executionTarget: {
        provider: 'server-config',
        adapter: 'postgres',
        targetName: 'development',
        credentialRef: 'vault:dbt/development',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-development',
          provider: 'postgres',
        },
        resolutionSource: 'environment-default',
      },
    });
  });

  it('invalidates the draft signature when revision, analysis, or target changes', () => {
    const first = buildDbtProjectFileExecutionStrategy(buildProjection());
    const second = buildDbtProjectFileExecutionStrategy(
      buildProjection({ analysisSha256: '3'.repeat(64) })
    );
    expect(first.kind).toBe('dbt_project_file_preview');
    expect(second.kind).toBe('dbt_project_file_preview');
    if (first.kind !== 'dbt_project_file_preview' || second.kind !== 'dbt_project_file_preview') {
      return;
    }

    expect(buildDbtProjectFileExecutionDraftSignature(first, 'planner-signature')).not.toBe(
      buildDbtProjectFileExecutionDraftSignature(second, 'planner-signature')
    );
  });

  it('invalidates the planner draft signature when requested roots change but closure does not', () => {
    const strategy = buildDbtProjectFileExecutionStrategy(
      buildProjection({
        nodes: [
          {
            uniqueId: 'model.analytics.base',
            resourceType: 'model',
            name: 'base',
            packageName: 'analytics',
            originalFilePath: 'models/base.sql',
            materialized: 'view',
            columns: [],
            tags: [],
            visualEditability: { status: 'editable', operations: ['edit-sql'] },
          },
          {
            uniqueId: 'model.analytics.orders',
            resourceType: 'model',
            name: 'orders',
            packageName: 'analytics',
            originalFilePath: 'models/orders.sql',
            materialized: 'table',
            columns: [],
            tags: [],
            visualEditability: { status: 'editable', operations: ['edit-sql'] },
          },
        ],
        edges: [
          {
            id: 'edge.analytics.base.orders',
            sourceUniqueId: 'model.analytics.base',
            targetUniqueId: 'model.analytics.orders',
            relation: 'dependency',
          },
        ],
      })
    );
    expect(strategy.kind).toBe('dbt_project_file_preview');
    if (strategy.kind !== 'dbt_project_file_preview') return;

    const workspaceNodeIds = ['model.analytics.base', 'model.analytics.orders'];
    const downstreamOnly = buildDbtProjectFilePlannerProjection({
      strategy,
      selectionIntent: { mode: 'explicit', nodeIds: ['model.analytics.orders'] },
      workspaceNodeIds,
    });
    const bothRoots = buildDbtProjectFilePlannerProjection({
      strategy,
      selectionIntent: { mode: 'explicit', nodeIds: workspaceNodeIds },
      workspaceNodeIds,
    });

    expect(downstreamOnly.ok).toBe(true);
    expect(bothRoots.ok).toBe(true);
    if (!downstreamOnly.ok || !bothRoots.ok) return;
    expect(downstreamOnly.selection).toEqual(bothRoots.selection);
    expect(downstreamOnly.draftSignature).not.toBe(bothRoots.draftSignature);
  });

  it('rejects persisted provenance from another revision or selection', () => {
    const strategy = buildDbtProjectFileExecutionStrategy(buildProjection());
    expect(strategy.kind).toBe('dbt_project_file_preview');
    if (strategy.kind !== 'dbt_project_file_preview') return;

    const provenance = buildDbtProjectFilePreviewProvenance(strategy, ['model.analytics.orders']);
    expect(
      isDbtProjectFilePreviewProvenanceCurrent(strategy, ['model.analytics.orders'], provenance)
    ).toBe(true);
    expect(
      isDbtProjectFilePreviewProvenanceCurrent(
        { ...strategy, analysisSha256: '3'.repeat(64) },
        ['model.analytics.orders'],
        provenance
      )
    ).toBe(false);
    expect(
      isDbtProjectFilePreviewProvenanceCurrent(strategy, ['model.analytics.other'], provenance)
    ).toBe(false);
  });
});
