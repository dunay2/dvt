import { describe, expect, it } from 'vitest';

import type { WorkspaceGraphDraftRecord } from '../../ports/workspace';
import {
  createUnknownCanvasDraftReadModel,
  type CanvasDraftReadModel,
} from './canvasDraftReadModel';
import {
  resolveActiveCanvasAuthoringMode,
  resolveActiveCanvasGraphStrategy,
} from './canvasActiveGraphStrategy';

function buildDraftReadModelWithCanvasKind(kind: string): CanvasDraftReadModel {
  const record: WorkspaceGraphDraftRecord = {
    revision: 'rev-1',
    savedAt: '2026-04-25T00:00:00Z',
    draft: {
      canvas: {
        kind,
        title: `${kind} canvas`,
      },
      nodeIds: [],
      nodePositions: {},
      edges: [],
    },
  };

  return createUnknownCanvasDraftReadModel(record);
}

describe('resolveActiveCanvasGraphStrategy', () => {
  it('uses the current draft canvas kind as the graph strategy selector', () => {
    expect(resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt'))).toMatchObject({
      kind: 'ready',
      canvasKind: 'dbt',
      strategy: {
        id: 'dbt',
      },
    });
    expect(resolveActiveCanvasAuthoringMode(buildDraftReadModelWithCanvasKind('dbt'))).toBe(
      'dbt'
    );
  });

  it('falls back to the transformation strategy before a canvas document exists', () => {
    expect(resolveActiveCanvasGraphStrategy(undefined)).toMatchObject({
      kind: 'missing_document',
      strategy: {
        id: 'transformation',
      },
    });
    expect(resolveActiveCanvasAuthoringMode(undefined)).toBe('transformation');
  });

  it('fails closed for persisted canvas documents with unsupported kind', () => {
    expect(resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('unknown'))).toEqual({
      kind: 'unsupported_kind',
      canvasKind: 'unknown',
    });
  });

  it('distinguishes disabled registered plugins from unsupported canvas kinds', () => {
    expect(
      resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt'), {
        plugins: {
          dbt: {
            available: false,
            reason: 'disabled_for_workspace',
          },
        },
      })
    ).toEqual({
      kind: 'disabled_plugin',
      canvasKind: 'dbt',
      pluginId: 'dbt',
      reason: 'disabled_for_workspace',
    });
  });
});
