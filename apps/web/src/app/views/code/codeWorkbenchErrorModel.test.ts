// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  WorkspaceFileLoadError,
  WorkspaceFileRevisionConflictError,
} from '../../services/workspace/workspaceErrors';
import { ApiError } from '../../services/api/createApiClient';
import { resolveCodeViewCopy } from './codeViewCopy';
import {
  resolveCodeFileCreationFailure,
  resolveCodeWorkbenchErrorPresentation,
} from './codeWorkbenchErrorModel';

describe('resolveCodeWorkbenchErrorPresentation', () => {
  const copy = resolveCodeViewCopy('en-US');

  it('classifies file-tree failures as route-level workspace errors', () => {
    expect(
      resolveCodeWorkbenchErrorPresentation({
        scope: 'file-tree',
        error: new Error('boom'),
      })
    ).toEqual({
      kind: 'workspace-tree-unavailable',
      title: copy.routeErrorTitle,
      message: copy.routeErrorMessage,
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
      title: copy.previewMissingTitle,
      message: copy.previewMissingMessagePrefix,
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
      title: copy.previewErrorTitle,
      message: copy.previewErrorMessage,
      selectedPath: 'README.md',
    });
  });

  it('accepts locale-resolved copy for product error presentation', () => {
    const spanishCopy = resolveCodeViewCopy('es-ES');

    expect(
      resolveCodeWorkbenchErrorPresentation({
        scope: 'file-tree',
        error: new Error('boom'),
        copy: spanishCopy,
      })
    ).toEqual({
      kind: 'workspace-tree-unavailable',
      title: spanishCopy.routeErrorTitle,
      message: spanishCopy.routeErrorMessage,
    });
  });
});

describe('create-only failure presentation', () => {
  it.each([401, 403])('uses the shared permission classifier for HTTP %s', (statusCode) => {
    const error = new ApiError({
      message: 'PRIVATE_TOKEN',
      endpoint: '/workspace/files',
      statusCode,
      category: 'forbidden',
    });
    expect(resolveCodeFileCreationFailure(error)).toBe('forbidden');
  });

  it('keeps revision conflicts distinct from unknown transport failures', () => {
    expect(
      resolveCodeFileCreationFailure(new WorkspaceFileRevisionConflictError('private.sql'))
    ).toBe('conflict');
    expect(resolveCodeFileCreationFailure(new Error('PRIVATE_DETAILS'))).toBe('unavailable');
  });
});
