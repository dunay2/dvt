import { describe, expect, it } from 'vitest';

import type { WorkspaceFileEntry } from '../../ports/workspace';
import { hasCodeWorkspaceFiles, resolveInitialCodeFilePath } from './codeViewFileSelection';

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
});
