// @vitest-environment jsdom
/** Cover durable Result links, unavailable snapshots and history restoration on the real detail tabs. */
import { act } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/dom';

import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import { flushRouterUpdate } from '../../routerFlushSync';
import { RunWorkspaceState } from './RunStates';
import { buildWorkspace, selectRunDetailTab, setRunStatesLanguage } from './test/RunStatesHarness';

let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
});

async function open(
  search: string,
  status: 'completed' | 'running' = 'completed'
): Promise<{
  router: ReturnType<typeof createMemoryRouter>;
  container: HTMLDivElement;
  screen: ReturnType<typeof within>;
}> {
  setRunStatesLanguage('en');
  const workspace = buildWorkspace({ snapshot: { runId: 'run_A', status } });
  const router = createMemoryRouter(
    [{ path: '/runs/:runId', element: <RunWorkspaceState workspace={workspace} /> }],
    { initialEntries: ['/runs/run_A' + search] }
  );
  mounted = await withTestQueryClient(
    <RouterProvider router={router} flushSync={flushRouterUpdate} />
  );
  return { router, container: mounted.container, screen: within(mounted.container) };
}

it('opens the selected run result, including its truthful empty state, and restores it with Back', async () => {
  const { router, container, screen } = await open('?focus=a&tab=result#run');
  expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Result');
  expect(screen.getByText(/result evidence is not available/i)).toBeDefined();
  expect(screen.queryByText('View result data')).toBeNull();
  await selectRunDetailTab(container, 'Summary');
  expect(router.state.location).toMatchObject({
    pathname: '/runs/run_A',
    search: '?focus=a',
    hash: '#run',
  });
  await act(() => router.navigate(-1));
  expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Result');
  await act(() => router.navigate(1));
  expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Summary');
});

it('publishes one history entry for mousedown and focus, including a fresh visit after Back', async () => {
  const { router, screen } = await open('?focus=a#run');
  const navigate = vi.spyOn(router, 'navigate');
  const result = screen.getByRole('tab', { name: 'Result' });
  async function selectResult(): Promise<void> {
    await act(() => {
      fireEvent.mouseDown(result, { button: 0, ctrlKey: false });
      fireEvent.focusIn(result);
    });
  }
  await selectResult();
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(router.state.location).toMatchObject({
    pathname: '/runs/run_A',
    search: '?focus=a&tab=result',
    hash: '#run',
  });
  expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Result');
  await act(() => router.navigate(-1));
  expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Summary');
  expect(router.state.location.search).toBe('?focus=a');
  navigate.mockClear();
  await selectResult();
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Result');
  navigate.mockRestore();
});

it.each([
  ['?tab=unknown', 'completed'],
  ['?tab=result', 'running'],
] as const)(
  'opens the summary for %s when the tab is invalid or unavailable (%s)',
  async (search, status) => {
    const { screen } = await open(search, status);
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe('Summary');
    expect(screen.queryByText(/result evidence is not available/i)).toBeNull();
  }
);
