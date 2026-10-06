// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RunWorkspaceState } from './RunStates';
import { createRunPublicationSnapshot } from './test/runPublicationFixture';
import {
  buildWorkspace,
  createRunStatesHarness,
  selectRunDetailTab,
  setRunStatesLanguage,
} from './test/RunStatesHarness';

describe('RunStates DVT PostgreSQL publication evidence', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;

  beforeEach(() => {
    setRunStatesLanguage('en');
    harness = createRunStatesHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('shows the immutable publication identity on the completed run result tab', async () => {
    const planSha = 'a'.repeat(64);
    const publicationToken = 'f'.repeat(64);

    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({
          snapshot: createRunPublicationSnapshot(),
        })}
      />
    );

    await selectRunDetailTab(harness.container, 'Result');

    expect(
      harness.container.querySelector('[data-slot="run-dvt-postgres-publication-card"]')
    ).not.toBeNull();
    expect(harness.container.textContent).toContain('dvt.orders_result');
    expect(harness.container.textContent).toContain('3');
    expect(harness.container.textContent).toContain('Created');
    expect(harness.container.textContent).toContain(planSha);
    expect(harness.container.textContent).toContain(publicationToken);
    expect(harness.container.textContent).not.toContain('Result evidence is not available yet');
  });

  it('places the optional row reader beside immutable evidence without requiring services', async () => {
    await harness.render(
      <RunWorkspaceState
        workspace={buildWorkspace({ snapshot: createRunPublicationSnapshot() })}
        publicationRows={
          <section aria-label="Publication row reader">Explicit row request</section>
        }
      />
    );

    await selectRunDetailTab(harness.container, 'Result');

    expect(harness.container.querySelector('[aria-label="Publication row reader"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('dvt.orders_result');
    expect(harness.container.textContent).toContain('f'.repeat(64));
  });
});
