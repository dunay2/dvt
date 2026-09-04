import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCanvasRouteHarness,
  currentCanvasRouteState,
  expectActiveCanvasShellIdentity,
  renderCanvasRouteWithController,
  requireAuthoringNodeKind,
  type CanvasRouteHarness,
} from './Canvas.test.support';

describe('Canvas route first-canvas catalog', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  function expectViewportAuthoringKinds(
    expectedKinds: readonly string[],
    absentKinds: readonly string[]
  ): void {
    const authoringNodeKinds = currentCanvasRouteState().viewportProps?.authoringNodeKinds as
      readonly ReturnType<typeof requireAuthoringNodeKind>[] | undefined;

    expect(authoringNodeKinds).toBeDefined();
    for (const kind of expectedKinds) {
      expect(authoringNodeKinds).toContain(requireAuthoringNodeKind(kind));
    }
    for (const kind of absentKinds) {
      expect(authoringNodeKinds).not.toContain(requireAuthoringNodeKind(kind));
    }
  }

  it('publishes a typed transformation empty canvas catalog to the contextual viewport', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
    });

    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Main canvas',
      kindLabel: 'Transformation',
    });
    expectViewportAuthoringKinds(['dvt:transform'], ['dbt:exposure', 'dbt:metric']);
  });

  it('publishes a typed dbt empty canvas catalog to the contextual viewport', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      canvasAuthoringMode: 'dbt',
    });

    expect(harness.container.querySelector('[data-slot="canvas-empty-state"]')).toBeNull();
    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'dbt canvas',
      kindLabel: 'dbt',
    });
    expectViewportAuthoringKinds(
      ['dbt:source', 'dbt:model', 'dbt:test'],
      ['dbt:seed', 'dbt:snapshot', 'dbt:exposure', 'dbt:metric', 'dbt:macro', 'dvt:transform']
    );
  });
});
