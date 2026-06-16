import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCanvasRouteHarness,
  expectActiveCanvasShellIdentity,
  renderCanvasRouteWithController,
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

  async function openFirstNodePalette(firstNodeLabel: string): Promise<void> {
    const trigger = Array.from(harness.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(firstNodeLabel)
    );
    expect(trigger).toBeDefined();
    await act(async () => {
      trigger?.click();
    });
  }

  it('shows a typed transformation empty canvas catalog instead of the dbt catalog', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'transformation',
        title: 'Main canvas',
      },
    });

    expect(harness.container.textContent).toContain('Start transformation canvas');
    expect(harness.container.textContent).toContain('Add first transformation node');
    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'Main canvas',
      kindLabel: 'Transformation',
    });
    await openFirstNodePalette('Add first transformation node');
    expect(document.body.textContent).toContain('SQL transform');
    expect(document.body.textContent).not.toContain('Exposure');
    expect(document.body.textContent).not.toContain('Metric');
  });

  it('shows a typed dbt empty canvas catalog instead of the transformation catalog', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      canvasAuthoringMode: 'dbt',
    });

    expect(harness.container.textContent).toContain('Start dbt canvas');
    expect(harness.container.textContent).toContain('Add first dbt node');
    expectActiveCanvasShellIdentity({
      container: harness.container,
      title: 'dbt canvas',
      kindLabel: 'dbt',
    });
    await openFirstNodePalette('Add first dbt node');
    expect(document.body.textContent).toContain('Exposure');
    expect(document.body.textContent).toContain('Metric');
    expect(document.body.textContent).not.toContain('SQL transform');
  });
});
