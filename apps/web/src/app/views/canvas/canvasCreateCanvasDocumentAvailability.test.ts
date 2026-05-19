import { describe, expect, it } from 'vitest';

import { deriveCanCreateCanvasDocument } from './canvasCreateCanvasDocumentAvailability';
import type { CanvasAuthoringDraftRecord } from './canvasDraftReadModel';

describe('canvasCreateCanvasDocumentAvailability', () => {
  it('opens first-canvas creation for a writable workspace with no authoritative draft', () => {
    expect(
      deriveCanCreateCanvasDocument({
        canPersistGraphDraft: true,
        graphDraftQuery: {
          data: {
            accessMode: 'unknown',
            capabilityReason: null,
            formatError: null,
            formatMeta: null,
            record: null,
            semanticGraph: null,
          },
          isPending: false,
          isError: false,
        },
      })
    ).toBe(true);
  });

  it('closes first-canvas creation when authoritative draft truth is not create-first eligible', () => {
    expect(
      deriveCanCreateCanvasDocument({
        canPersistGraphDraft: false,
        graphDraftQuery: {
          data: undefined,
          isPending: false,
          isError: false,
        },
      })
    ).toBe(false);

    expect(
      deriveCanCreateCanvasDocument({
        canPersistGraphDraft: true,
        graphDraftQuery: {
          data: undefined,
          isPending: true,
          isError: false,
        },
      })
    ).toBe(false);

    expect(
      deriveCanCreateCanvasDocument({
        canPersistGraphDraft: true,
        graphDraftQuery: {
          data: undefined,
          isPending: false,
          isError: true,
        },
      })
    ).toBe(false);

    expect(
      deriveCanCreateCanvasDocument({
        canPersistGraphDraft: true,
        graphDraftQuery: {
          data: {
            accessMode: 'writable',
            capabilityReason: 'authorized',
            formatError: null,
            formatMeta: null,
            record: {
              revision: 'rev-existing',
              savedAt: '2026-05-19T00:00:00.000Z',
              draft: {
                canvas: {
                  kind: 'transformation',
                  title: 'Transformation canvas',
                },
                nodeIds: [],
                nodePositions: {},
                nodes: [],
                edges: [],
              },
            } satisfies CanvasAuthoringDraftRecord,
            semanticGraph: null,
          },
          isPending: false,
          isError: false,
        },
      })
    ).toBe(false);
  });
});
