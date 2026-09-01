import { describe, expect, it } from 'vitest';

import { createWritableCanvasAuthoringDraftReadModel } from './canvasDraftReadModel';
import { buildGraphDraftAuthority } from './canvasDraftRepository.test.fixtures';
import { executeCreateCanvasDocumentCommand } from './canvasCreateCanvasDocumentCommand';
import {
  buildCommandArgs,
  buildEmptyDraft,
  buildRecord,
} from './canvasCreateCanvasDocumentCommand.test.support';

describe('canvasCreateCanvasDocumentCommand replacement modes', () => {
  it('replaces an existing authoritative draft only when the command explicitly requests replacement', async () => {
    const existingRecord = buildRecord({
      revision: 'rev-existing',
      draft: buildEmptyDraft({
        nodeIds: ['src_orders'],
        nodePositions: {
          src_orders: { x: 120, y: 80 },
        },
        nodes: [
          {
            id: 'src_orders',
            name: 'src_orders',
            pluginId: 'dvt',
            kind: 'source',
            role: 'input',
            status: 'idle',
            tags: [],
          },
          {
            id: 'model_orders',
            name: 'model_orders',
            pluginId: 'dvt',
            kind: 'transform',
            role: 'transform',
            status: 'idle',
            tags: [],
          },
        ],
        edges: [
          {
            id: 'edge-src-model',
            sourceId: 'src_orders',
            targetId: 'model_orders',
            relation: 'lineage',
          },
        ],
      }),
    });
    const { args, draftRepository, draftQueryCache, setDraftSaveStatus } = buildCommandArgs({
      command: {
        kind: 'dbt',
        title: 'DBT canvas',
        mode: 'replace_current',
      },
      graphDraftQuery: {
        data: createWritableCanvasAuthoringDraftReadModel(
          existingRecord,
          buildGraphDraftAuthority(null)
        ),
        isPending: false,
        isError: false,
      },
    });

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(draftRepository.saveGraphDraft).toHaveBeenCalledWith({
      expectedRevision: 'rev-existing',
      idempotencyKey: expect.any(String),
      draft: {
        canvas: {
          id: 'dbt-canvas',
          kind: 'dbt',
          title: 'DBT canvas',
        },
        activeCanvasId: 'dbt-canvas',
        nodeIds: [],
        nodePositions: {},
        nodes: [],
        edges: [],
        canvases: [
          {
            canvas: {
              id: 'dbt-canvas',
              kind: 'dbt',
              title: 'DBT canvas',
            },
            nodeIds: [],
            nodePositions: {},
            nodes: [],
            edges: [],
          },
        ],
      },
    });
    expect(draftQueryCache.replaceRemoteDraftState).toHaveBeenCalledTimes(1);
    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['saved']]);
  });

  it('creates a new canvas workspace without deleting the current active graph', async () => {
    const existingDraft = buildEmptyDraft({
      nodeIds: ['src_orders'],
      nodePositions: {
        src_orders: { x: 120, y: 80 },
      },
      nodes: [
        {
          id: 'src_orders',
          name: 'src_orders',
          pluginId: 'dvt',
          kind: 'source',
          role: 'input',
          status: 'idle',
          tags: [],
        },
      ],
      edges: [],
    });
    const existingRecord = buildRecord({
      revision: 'rev-existing',
      draft: existingDraft,
    });
    const { args, draftRepository } = buildCommandArgs({
      command: {
        kind: 'dbt',
        title: 'DBT canvas',
        mode: 'create_new',
      },
      currentDraftPayload: existingDraft,
      graphDraftQuery: {
        data: createWritableCanvasAuthoringDraftReadModel(
          existingRecord,
          buildGraphDraftAuthority(null)
        ),
        isPending: false,
        isError: false,
      },
    });

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledWith({
      expectedRevision: 'rev-existing',
      idempotencyKey: expect.any(String),
      draft: expect.objectContaining({
        canvas: {
          id: 'dbt-canvas',
          kind: 'dbt',
          title: 'DBT canvas',
        },
        activeCanvasId: 'dbt-canvas',
        nodeIds: [],
        nodePositions: {},
        nodes: [],
        edges: [],
        canvases: [
          expect.objectContaining({
            canvas: {
              id: 'transformation-canvas',
              kind: 'transformation',
              title: 'Transformation canvas',
            },
            nodeIds: ['src_orders'],
          }),
          expect.objectContaining({
            canvas: {
              id: 'dbt-canvas',
              kind: 'dbt',
              title: 'DBT canvas',
            },
            nodeIds: [],
          }),
        ],
      }),
    });
  });
});
