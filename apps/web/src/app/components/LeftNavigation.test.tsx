// @vitest-environment jsdom
/** Owned concern: verify direct shell navigation and the real About focus lifecycle. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, waitFor, within } from '@testing-library/dom';
import { MemoryRouter } from 'react-router';
import { Activity } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeftNavigationRail } from './LeftNavigation';
import { resolveShellTopBarCopy } from './shell/copy';
import type { ShellNavigationModel } from '../shell/shellNavigationModel';

const model: ShellNavigationModel = {
  primaryItems: [{ to: '/runs', label: 'Runs', icon: Activity, source: 'runtime', level: 'core' }],
  footerItems: [],
};
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom has no layout observer; this is only the Tooltip DOM capability.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/runs/active']}>
        <LeftNavigationRail navigationModel={model} copy={resolveShellTopBarCopy('en')} />
      </MemoryRouter>
    );
  });
});
afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

describe('Direct shell navigation', () => {
  it('renders exactly the supplied destinations with link activity and accessible icon names', () => {
    const links = within(container).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('/runs');
    expect(links[0]?.getAttribute('aria-current')).toBe('page');
    expect(links[0]?.getAttribute('aria-expanded')).toBeNull();
    expect(within(container).getByRole('link', { name: 'Runs' })).toBe(links[0]);
    expect(links[0]?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(within(container).queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('opens compiled About metadata directly and restores focus on Escape', async () => {
    const trigger = within(container).getByRole('button', { name: 'About Raven' });
    await act(async () => {
      trigger.focus();
      fireEvent.click(trigger);
    });
    const dialog = await waitFor(() => within(document.body).getByRole('dialog'));
    expect(dialog.textContent).toContain('Compiled version');
    expect(dialog.textContent).toMatch(/\d+\.\d+\.\d+/u);
    expect(dialog.contains(document.activeElement)).toBe(true);
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    await waitFor(() => {
      expect(within(document.body).queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('exposes the same destination name through keyboard-focus tooltip', async () => {
    const link = within(container).getByRole('link', { name: 'Runs' });
    await act(async () => {
      link.focus();
    });
    await waitFor(() => {
      expect(within(document.body).getByRole('tooltip').textContent).toBe('Runs');
    });
    expect(document.activeElement).toBe(link);
  });
});
