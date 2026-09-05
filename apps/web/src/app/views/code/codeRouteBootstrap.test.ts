// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { deriveCodeRouteBootstrapPresentation } from './codeRouteBootstrap';
import { resolveCodeViewCopy } from './codeViewCopy';

describe('codeRouteBootstrap', () => {
  const copy = resolveCodeViewCopy('en-US');

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
      detail: copy.bootstrapLoadingFilesDetail,
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
      detail: copy.bootstrapLoadingPreviewDetail,
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
    });
  });

  it('publishes complete route details from the Code copy catalog', () => {
    expect(
      deriveCodeRouteBootstrapPresentation({
        isLoadingFileTree: false,
        fileTreeErrorMessage: null,
        hasWorkspaceFiles: false,
        isLoadingFilePreview: false,
        filePreviewErrorMessage: null,
      })
    ).toEqual({
      status: 'complete',
      detail: copy.bootstrapNoWorkspaceFilesDetail,
    });

    expect(
      deriveCodeRouteBootstrapPresentation({
        isLoadingFileTree: false,
        fileTreeErrorMessage: null,
        hasWorkspaceFiles: true,
        isLoadingFilePreview: false,
        filePreviewErrorMessage: null,
      })
    ).toEqual({
      status: 'complete',
      detail: copy.bootstrapReadyDetail,
    });
  });

  it('accepts locale-resolved copy for route bootstrap details', () => {
    const spanishCopy = resolveCodeViewCopy('es-ES');

    expect(
      deriveCodeRouteBootstrapPresentation(
        {
          isLoadingFileTree: true,
          fileTreeErrorMessage: null,
          hasWorkspaceFiles: false,
          isLoadingFilePreview: false,
          filePreviewErrorMessage: null,
        },
        spanishCopy
      )
    ).toMatchObject({
      status: 'pending',
      detail: spanishCopy.bootstrapLoadingFilesDetail,
    });
  });
});
