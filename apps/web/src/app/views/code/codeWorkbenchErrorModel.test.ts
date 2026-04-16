import { describe, expect, it } from 'vitest';

import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import { resolveCodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';

describe('resolveCodeWorkbenchErrorPresentation', () => {
  it('classifies file-tree failures as route-level workspace errors', () => {
    expect(
      resolveCodeWorkbenchErrorPresentation({
        scope: 'file-tree',
        error: new Error('boom'),
      })
    ).toEqual({
      kind: 'workspace-tree-unavailable',
      title: 'Workspace files unavailable',
      message: 'The file explorer could not be loaded right now.',
    });
  });

  it('classifies missing files separately from generic preview failures', () => {
    expect(
      resolveCodeWorkbenchErrorPresentation({
        scope: 'file-preview',
        error: new WorkspaceFileLoadError('not_found', 'models/staging/stg_orders.sql'),
      })
    ).toEqual({
      kind: 'file-missing',
      title: 'Selected file unavailable',
      message: 'The selected file is no longer available in this workspace:',
      selectedPath: 'models/staging/stg_orders.sql',
    });
  });

  it('keeps generic preview failures in one product bucket', () => {
    expect(
      resolveCodeWorkbenchErrorPresentation({
        scope: 'file-preview',
        error: new Error('Request failed'),
        selectedPath: 'README.md',
      })
    ).toEqual({
      kind: 'file-preview-unavailable',
      title: 'File preview unavailable',
      message: 'The selected file could not be loaded right now.',
      selectedPath: 'README.md',
    });
  });
});
