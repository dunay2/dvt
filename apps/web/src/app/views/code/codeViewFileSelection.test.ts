import { describe, expect, it } from 'vitest';

import type { WorkspaceFileEntry } from '../../ports/workspace';
import {
  deriveCodeGraphFilePaths,
  hasCodeWorkspaceFilePath,
  hasCodeWorkspaceFiles,
  resolveGraphScopedCodeWorkspaceFileTree,
  resolveInitialCodeFilePath,
} from './codeViewFileSelection';

describe('codeViewFileSelection', () => {
  it('selects the first reachable file from a nested workspace tree', () => {
    const tree: WorkspaceFileEntry[] = [
      {
        path: 'models',
        name: 'models',
        kind: 'directory',
        children: [
          {
            path: 'models/staging',
            name: 'staging',
            kind: 'directory',
            children: [
              {
                path: 'models/staging/stg_orders.sql',
                name: 'stg_orders.sql',
                kind: 'file',
              },
            ],
          },
          {
            path: 'models/marts/orders.sql',
            name: 'orders.sql',
            kind: 'file',
          },
        ],
      },
    ];

    expect(resolveInitialCodeFilePath(tree)).toBe('models/staging/stg_orders.sql');
    expect(hasCodeWorkspaceFiles(tree)).toBe(true);
  });

  it('prefers the graph workflow artifact over project config files', () => {
    const tree: WorkspaceFileEntry[] = [
      {
        path: 'dbt_project.yml',
        name: 'dbt_project.yml',
        kind: 'file',
      },
      {
        path: 'models',
        name: 'models',
        kind: 'directory',
        children: [
          {
            path: 'models/dvt-sql-transform-1.sql',
            name: 'dvt-sql-transform-1.sql',
            kind: 'file',
          },
        ],
      },
      {
        path: 'pipelines',
        name: 'pipelines',
        kind: 'directory',
        children: [
          {
            path: 'pipelines/project-transformation-preview.yaml',
            name: 'project-transformation-preview.yaml',
            kind: 'file',
          },
        ],
      },
    ];

    expect(resolveInitialCodeFilePath(tree)).toBe('pipelines/project-transformation-preview.yaml');
  });

  it('prefers graph model code over dbt project configuration when no workflow artifact exists', () => {
    const tree: WorkspaceFileEntry[] = [
      {
        path: 'dbt_project.yml',
        name: 'dbt_project.yml',
        kind: 'file',
      },
      {
        path: 'models',
        name: 'models',
        kind: 'directory',
        children: [
          {
            path: 'models/payments_model.sql',
            name: 'payments_model.sql',
            kind: 'file',
          },
          {
            path: 'models/schema.yml',
            name: 'schema.yml',
            kind: 'file',
          },
        ],
      },
    ];

    expect(resolveInitialCodeFilePath(tree)).toBe('models/payments_model.sql');
  });

  it('keeps directory-only trees out of the editable Code route', () => {
    const tree: WorkspaceFileEntry[] = [
      {
        path: 'models',
        name: 'models',
        kind: 'directory',
        children: [{ path: 'models/empty', name: 'empty', kind: 'directory' }],
      },
    ];

    expect(resolveInitialCodeFilePath(tree)).toBeUndefined();
    expect(hasCodeWorkspaceFiles(tree)).toBe(false);
  });

  it('derives dbt model files from the current graph node name instead of the stale node id', () => {
    const filePaths = deriveCodeGraphFilePaths({
      nodes: [
        {
          id: 'orders_model',
          name: 'payments model',
          type: 'MODEL',
          package: 'dbt',
          path: '',
          tags: ['model'],
          status: 'idle',
          dependencies: ['warehouse_payments'],
        },
      ],
      edges: [],
    });

    expect([...filePaths]).toContain('models/payments_model.sql');
    expect([...filePaths]).not.toContain('models/orders_model.sql');
    expect([...filePaths]).toContain('dbt_project.yml');
    expect([...filePaths]).toContain('models/schema.yml');
  });

  it('filters stale dbt files when the active graph is a SQL transformation canvas', () => {
    const tree: WorkspaceFileEntry[] = [
      {
        path: 'dbt_project.yml',
        name: 'dbt_project.yml',
        kind: 'file',
      },
      {
        path: 'models',
        name: 'models',
        kind: 'directory',
        children: [
          {
            path: 'models/dvt-sql-transform-1.sql',
            name: 'dvt-sql-transform-1.sql',
            kind: 'file',
          },
          {
            path: 'models/payments_model.sql',
            name: 'payments_model.sql',
            kind: 'file',
          },
          {
            path: 'models/sources',
            name: 'sources',
            kind: 'directory',
            children: [
              {
                path: 'models/sources/src_raw.yml',
                name: 'src_raw.yml',
                kind: 'file',
              },
            ],
          },
        ],
      },
      {
        path: 'pipelines',
        name: 'pipelines',
        kind: 'directory',
        children: [
          {
            path: 'pipelines/project-transformation-preview.yaml',
            name: 'project-transformation-preview.yaml',
            kind: 'file',
          },
        ],
      },
    ];

    const scopedTree = resolveGraphScopedCodeWorkspaceFileTree({
      entries: tree,
      graph: {
        nodes: [
          {
            id: 'dvt-sql-transform-1',
            name: 'SQL transform 1',
            type: 'MODEL',
            package: 'dvt',
            path: '',
            tags: ['authoring'],
            status: 'idle',
            dependencies: ['source-1'],
          },
          {
            id: 'src_local_postgres_dvt_raw_orders',
            name: 'src_local_postgres_dvt_raw_orders',
            type: 'SOURCE',
            package: 'dvt.warehouse-source',
            path: 'models/sources/src_raw.yml',
            tags: ['source'],
            status: 'idle',
            dependencies: [],
          },
        ],
        edges: [],
      },
    });

    expect(hasCodeWorkspaceFilePath(scopedTree, 'models/dvt-sql-transform-1.sql')).toBe(true);
    expect(hasCodeWorkspaceFilePath(scopedTree, 'models/sources/src_raw.yml')).toBe(true);
    expect(hasCodeWorkspaceFilePath(scopedTree, 'models/payments_model.sql')).toBe(false);
    expect(hasCodeWorkspaceFilePath(scopedTree, 'dbt_project.yml')).toBe(false);
    expect(resolveInitialCodeFilePath(scopedTree)).toBe(
      'pipelines/project-transformation-preview.yaml'
    );
  });

  it('falls back to the full tree when graph scope has no matching workspace files yet', () => {
    const tree: WorkspaceFileEntry[] = [
      {
        path: 'README.md',
        name: 'README.md',
        kind: 'file',
      },
    ];

    const scopedTree = resolveGraphScopedCodeWorkspaceFileTree({
      entries: tree,
      graph: {
        nodes: [
          {
            id: 'model-orders',
            name: 'Orders',
            type: 'MODEL',
            package: 'dvt',
            path: 'models/analytics/model_orders.sql',
            tags: [],
            status: 'idle',
            dependencies: [],
          },
        ],
        edges: [],
      },
    });

    expect(scopedTree).toEqual(tree);
    expect(resolveInitialCodeFilePath(scopedTree)).toBe('README.md');
  });
});
