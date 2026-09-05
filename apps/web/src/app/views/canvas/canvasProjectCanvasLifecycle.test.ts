import { describe, expect, it } from 'vitest';

import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import {
  buildDraftWithSelectedProjectCanvas,
  createProjectCanvasId,
} from './canvasProjectCanvasLifecycle';

function buildDraft(): WorkspaceGraphAuthoringDraft {
  return {
    canvas: {
      id: 'canvas-modeling',
      kind: 'transformation',
      title: 'Modeling',
    },
    activeCanvasId: 'canvas-modeling',
    canvases: [
      {
        canvas: {
          id: 'canvas-ingest',
          kind: 'transformation',
          title: 'Ingest',
        },
        nodeIds: [],
        nodePositions: {},
        nodes: [],
        edges: [],
      },
      {
        canvas: {
          id: 'canvas-modeling',
          kind: 'transformation',
          title: 'Modeling',
        },
        nodeIds: ['model_orders'],
        nodePositions: {
          model_orders: { x: 120, y: 80 },
        },
        nodes: [
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
        edges: [],
      },
    ],
    nodeIds: ['model_orders'],
    nodePositions: {
      model_orders: { x: 120, y: 80 },
    },
    nodes: [
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
    edges: [],
  };
}

describe('canvasProjectCanvasLifecycle', () => {
  it('creates stable ASCII canvas ids from localized titles', () => {
    expect(
      createProjectCanvasId({
        canvas: { kind: 'transformation', title: 'Canvas de transformación' },
        existingIds: new Set(),
      })
    ).toBe('canvas-de-transformacion');
  });

  it('selects another canvas without losing the current active workspace graph', () => {
    const result = buildDraftWithSelectedProjectCanvas({
      currentDraft: buildDraft(),
      canvasId: 'canvas-ingest',
    });

    expect(result).toMatchObject({
      canvas: {
        id: 'canvas-ingest',
        title: 'Ingest',
      },
      activeCanvasId: 'canvas-ingest',
      nodeIds: [],
    });
    expect(
      result?.canvases?.find((canvas) => canvas.canvas.id === 'canvas-modeling')
    ).toMatchObject({
      nodeIds: ['model_orders'],
    });
  });
});
