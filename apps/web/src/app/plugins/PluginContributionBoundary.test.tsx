// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginContributionBoundary } from './PluginContributionBoundary';

function ThrowingContribution(): never {
  throw new Error('plugin render failed');
}

describe('PluginContributionBoundary', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders the supplied local fallback when one plugin contribution throws', () => {
    act(() => {
      root.render(
        <PluginContributionBoundary fallback={<div data-slot="local-fallback">Fallback</div>}>
          <ThrowingContribution />
        </PluginContributionBoundary>
      );
    });

    expect(container.querySelector('[data-slot="local-fallback"]')).not.toBeNull();
  });
});
