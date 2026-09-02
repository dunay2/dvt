import { describe, expect, it } from 'vitest';

import {
  type CanvasAuthoringDraftRecord,
  createUnknownCanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftReadModel,
} from '../canvasDraftReadModel';
import {
  resolveActiveCanvasAuthoringMode,
  resolveActiveCanvasGraphStrategy,
  selectActiveCanvasExecutionStrategy,
  selectActiveCanvasGraphStrategy,
  selectActiveCanvasSurfaceStrategy,
} from '../canvasActiveGraphStrategy';

function buildDraftReadModelWithCanvasKind(kind: string): CanvasAuthoringDraftReadModel {
  const record: CanvasAuthoringDraftRecord = {
    revision: 'rev-1',
    savedAt: '2026-04-25T00:00:00Z',
    draft: {
      canvas: {
        kind,
        title: `${kind} canvas`,
      },
      nodeIds: [],
      nodePositions: {},
      nodes: [],
      edges: [],
    },
  };

  return createUnknownCanvasAuthoringDraftReadModel(record);
}

describe('resolveActiveCanvasGraphStrategy', () => {
  it('uses the current draft canvas kind as the graph strategy selector', () => {
    expect(
      resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt'))
    ).toMatchObject({
      kind: 'ready',
      canvasKind: 'dbt',
      strategy: {
        id: 'dbt',
      },
      surfaceStrategy: {
        id: 'dbt-contextual-canvas',
      },
    });
    expect(resolveActiveCanvasAuthoringMode(buildDraftReadModelWithCanvasKind('dbt'))).toBe('dbt');
  });

  it('falls back to the transformation strategy before a canvas document exists', () => {
    expect(resolveActiveCanvasGraphStrategy(undefined)).toMatchObject({
      kind: 'missing_document',
      strategy: {
        id: 'transformation',
      },
      surfaceStrategy: {
        id: 'dvt-transformation-contextual-canvas',
      },
    });
    expect(resolveActiveCanvasAuthoringMode(undefined)).toBe('transformation');
  });

  it('fails closed without throwing when the default canvas plugin is disabled before document creation', () => {
    expect(
      resolveActiveCanvasGraphStrategy(undefined, {
        plugins: {
          dvt: {
            available: false,
            reason: 'disabled_for_workspace',
          },
        },
      })
    ).toEqual({
      kind: 'disabled_plugin',
      canvasKind: 'transformation',
      pluginId: 'dvt',
      reason: 'disabled_for_workspace',
    });
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

  it('does not invent fallback strategies for unsupported or disabled active runtimes', () => {
    const unsupported = resolveActiveCanvasGraphStrategy(
      buildDraftReadModelWithCanvasKind('unknown')
    );
    const disabled = resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt'), {
      plugins: {
        dbt: {
          available: false,
        },
      },
    });

    expect(selectActiveCanvasGraphStrategy(unsupported)).toBeNull();
    expect(selectActiveCanvasExecutionStrategy(unsupported)).toBeNull();
    expect(selectActiveCanvasSurfaceStrategy(unsupported)).toBeNull();
    expect(selectActiveCanvasGraphStrategy(disabled)).toBeNull();
    expect(selectActiveCanvasExecutionStrategy(disabled)).toBeNull();
    expect(selectActiveCanvasSurfaceStrategy(disabled)).toBeNull();
  });
});
