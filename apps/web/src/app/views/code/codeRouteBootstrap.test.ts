import { describe, expect, it } from 'vitest';

import { deriveCodeRouteBootstrapPresentation } from './codeRouteBootstrap';

describe('codeRouteBootstrap', () => {
  it('keeps the route pending until the initial file tree and preview settle', () => {
    expect(
      deriveCodeRouteBootstrapPresentation({
        isLoadingFileTree: true,
        fileTreeErrorMessage: null,
        hasWorkspaceFiles: false,
        isLoadingFilePreview: false,
        filePreviewErrorMessage: null,
      })
    ).toMatchObject({
      status: 'pending',
      canComplete: false,
    });

    expect(
      deriveCodeRouteBootstrapPresentation({
        isLoadingFileTree: false,
        fileTreeErrorMessage: null,
        hasWorkspaceFiles: true,
        isLoadingFilePreview: true,
        filePreviewErrorMessage: null,
      })
    ).toMatchObject({
      status: 'pending',
      canComplete: false,
    });
  });

  it('maps file-tree or preview failures to non-blocking failed posture', () => {
    expect(
      deriveCodeRouteBootstrapPresentation({
        isLoadingFileTree: false,
        fileTreeErrorMessage: 'Tree unavailable',
        hasWorkspaceFiles: false,
        isLoadingFilePreview: false,
        filePreviewErrorMessage: null,
      })
    ).toEqual({
      status: 'failed',
      detail: 'Tree unavailable',
      canComplete: true,
    });

    expect(
      deriveCodeRouteBootstrapPresentation({
        isLoadingFileTree: false,
        fileTreeErrorMessage: null,
        hasWorkspaceFiles: true,
        isLoadingFilePreview: false,
        filePreviewErrorMessage: 'Preview unavailable',
      })
    ).toEqual({
      status: 'failed',
      detail: 'Preview unavailable',
      canComplete: true,
    });
  });
});
