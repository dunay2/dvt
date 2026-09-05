import { describe, expect, it } from 'vitest';

import {
  type CanvasAuthoringDraftRecord,
  createUnknownCanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';
import {
  resolveActiveCanvasGraphStrategy,
  selectActiveCanvasExecutionStrategy,
  selectActiveCanvasGraphStrategy,
  selectActiveCanvasSurfaceStrategy,
} from './canvasActiveGraphStrategy';

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
  it('uses the shared transformation Canvas runtime for persisted Canvas documents', () => {
    expect(
      resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('transformation'))
    ).toMatchObject({
      kind: 'ready',
      canvasKind: 'transformation',
      strategy: {
        id: 'transformation',
      },
      surfaceStrategy: {
        id: 'dvt-transformation-contextual-canvas',
      },
    });
  });

  it('fails closed for obsolete persisted dbt Canvas kinds instead of aliasing them', () => {
    expect(resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt'))).toEqual({
      kind: 'unsupported_kind',
      canvasKind: 'dbt',
    });
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

  it('does not turn dbt plugin availability into a Canvas kind registration', () => {
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
      kind: 'unsupported_kind',
      canvasKind: 'dbt',
    });
  });

  it('does not invent fallback strategies for unsupported active runtimes', () => {
    const unsupported = resolveActiveCanvasGraphStrategy(
      buildDraftReadModelWithCanvasKind('unknown')
    );
    const obsoleteDbt = resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt'));

    expect(selectActiveCanvasGraphStrategy(unsupported)).toBeNull();
    expect(selectActiveCanvasExecutionStrategy(unsupported)).toBeNull();
    expect(selectActiveCanvasSurfaceStrategy(unsupported)).toBeNull();
    expect(selectActiveCanvasGraphStrategy(obsoleteDbt)).toBeNull();
    expect(selectActiveCanvasExecutionStrategy(obsoleteDbt)).toBeNull();
    expect(selectActiveCanvasSurfaceStrategy(obsoleteDbt)).toBeNull();
  });
});
