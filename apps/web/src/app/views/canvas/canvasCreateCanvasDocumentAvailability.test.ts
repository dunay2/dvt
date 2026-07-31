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
            authoringAuthority: {
              kind: 'unresolved',
              reason: 'missing_authority',
              canvasId: null,
            },
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

  it('closes canvas creation when authoritative draft truth is unavailable', () => {
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
  });

  it('keeps canvas creation open when an authoritative draft already exists', () => {
    expect(
      deriveCanCreateCanvasDocument({
        canPersistGraphDraft: true,
        graphDraftQuery: {
          data: {
            accessMode: 'writable',
            authoringAuthority: {
              kind: 'resolved',
              binding: {
                schemaVersion: 'canvas-authoring-authority-binding.v1',
                canvasId: 'main-canvas',
                authority: { kind: 'graph-draft' },
              },
            },
            capabilityReason: 'authorized',
            formatError: null,
            formatMeta: null,
            record: {
              revision: 'rev-existing',
              savedAt: '2026-05-19T00:00:00.000Z',
              draft: {
                canvas: {
                  id: 'main-canvas',
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
    ).toBe(true);
  });
});
