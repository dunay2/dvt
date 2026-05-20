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
