// @vitest-environment jsdom

/** Owned concern: prove canonical Canvas consumes migrated route intent contextually. */
import { waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasRouteHarness,
  currentCanvasRouteLocation,
  renderCanvasRouteWithController,
  type CanvasRouteHarness,
} from './Canvas.test.support';

describe('Canvas route intent integration', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('opens contextual project Code and consumes its one-shot URL intent', async () => {
    await renderCanvasRouteWithController(harness, undefined, {
      initialEntry: '/canvas?canvasIntent=project-code',
    });

    await waitFor(() =>
      expect(
        harness.container.querySelector('[data-slot="canvas-contextual-workbench"]')
      ).not.toBeNull()
    );
    await waitFor(() => expect(currentCanvasRouteLocation()?.search).toBe(''));

    expect(currentCanvasRouteLocation()?.pathname).toBe('/canvas');
  });

  it('routes a migrated Lineage deep link through the existing Canvas lens', async () => {
    const toggleColumnLevelLineage = vi.fn();

    await renderCanvasRouteWithController(
      harness,
      { toggleColumnLevelLineage },
      { initialEntry: '/canvas?canvasIntent=column-lineage' }
    );

    await waitFor(() => expect(toggleColumnLevelLineage).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(currentCanvasRouteLocation()?.search).toBe(''));
  });
});
