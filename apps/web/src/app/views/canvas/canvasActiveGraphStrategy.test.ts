import { describe, expect, it } from 'vitest';

import {
  type CanvasAuthoringDraftRecord,
  createUnknownCanvasAuthoringDraftReadModel,
  type CanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';
import {
  isActiveCanvasGraphStrategySupported,
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
  it.each(['transformation', ' TRANSFORMATION '])(
    'uses the shared transformation Canvas runtime for persisted kind %j',
    (canvasKind) => {
      expect(
        resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind(canvasKind))
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
    }
  );

  it('fails closed for obsolete persisted dbt Canvas kinds instead of aliasing them', () => {
    expect(resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt'))).toEqual({
      kind: 'unsupported_kind',
      canvasKind: 'dbt',
    });
  });

  it.each([undefined, '', ' \t '])(
    'retains the default presentation without a usable document kind (%j)',
    (canvasKind) => {
      const resolution = resolveActiveCanvasGraphStrategy(
        canvasKind === undefined ? undefined : buildDraftReadModelWithCanvasKind(canvasKind)
      );
      expect(resolution).toMatchObject({
        kind: 'missing_document',
        executionStrategy: { kind: 'dvt_protected_preview' },
        strategy: {
          id: 'transformation',
        },
        surfaceStrategy: {
          id: 'dvt-transformation-contextual-canvas',
        },
      });
      expect(resolution).not.toHaveProperty('canvasKind');
      expect(resolution).toHaveProperty('nodeKinds', expect.any(Array));
    }
  );

  it.each([undefined, '', 'disabled_for_workspace'])(
    'fails closed for a disabled default or explicit Canvas kind with reason %j',
    (reason) => {
      for (const canvasKind of [undefined, 'transformation']) {
        const resolution = resolveActiveCanvasGraphStrategy(
          canvasKind === undefined ? undefined : buildDraftReadModelWithCanvasKind(canvasKind),
          {
            plugins: {
              dvt: {
                available: false,
                ...(reason === undefined ? {} : { reason }),
              },
            },
          }
        );
        expect(resolution).toStrictEqual({
          kind: 'disabled_plugin',
          canvasKind: 'transformation',
          pluginId: 'dvt',
          ...(reason === undefined ? {} : { reason }),
        });
      }
    }
  );

  it.each(['unknown', ' UNKNOWN '])(
    'fails closed for unsupported persisted kind %j',
    (canvasKind) => {
      expect(
        resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind(canvasKind))
      ).toEqual({
        kind: 'unsupported_kind',
        canvasKind: 'unknown',
      });
    }
  );

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

  it.each([undefined, 'transformation'])(
    'selects the registered presentation strategies for kind %j',
    (canvasKind) => {
      const resolution = resolveActiveCanvasGraphStrategy(
        canvasKind === undefined ? undefined : buildDraftReadModelWithCanvasKind(canvasKind)
      );
      expect(isActiveCanvasGraphStrategySupported(resolution)).toBe(true);
      if (resolution.kind !== 'ready' && resolution.kind !== 'missing_document') {
        throw new Error('Expected a supported Canvas presentation');
      }
      expect(selectActiveCanvasGraphStrategy(resolution)).toBe(resolution.strategy);
      expect(selectActiveCanvasExecutionStrategy(resolution)).toBe(resolution.executionStrategy);
      expect(selectActiveCanvasSurfaceStrategy(resolution)).toBe(resolution.surfaceStrategy);
    }
  );

  it('does not invent fallback strategies for unsupported or disabled active runtimes', () => {
    const unsupported = resolveActiveCanvasGraphStrategy(
      buildDraftReadModelWithCanvasKind('unknown')
    );
    const obsoleteDbt = resolveActiveCanvasGraphStrategy(buildDraftReadModelWithCanvasKind('dbt'));
    const disabled = resolveActiveCanvasGraphStrategy(
      buildDraftReadModelWithCanvasKind('transformation'),
      { plugins: { dvt: { available: false } } }
    );

    for (const resolution of [unsupported, obsoleteDbt, disabled]) {
      expect(isActiveCanvasGraphStrategySupported(resolution)).toBe(false);
      expect(selectActiveCanvasGraphStrategy(resolution)).toBeNull();
      expect(selectActiveCanvasExecutionStrategy(resolution)).toBeNull();
      expect(selectActiveCanvasSurfaceStrategy(resolution)).toBeNull();
    }
  });
});
