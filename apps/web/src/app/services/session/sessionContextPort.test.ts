// @vitest-environment jsdom

/** Owned concern: prove stable workspace snapshots across concurrent query subscribers. */
import { describe, expect, it, vi } from 'vitest';

import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';
import { createSessionContextPort } from './sessionContextPort';

installWorkspaceScopeHarness();

describe('sessionContextPort workspace subscriptions', () => {
  it('preserves one snapshot reference while multiple consumers subscribe', () => {
    setWorkspaceScope(buildWorkspaceScope());
    const port = createSessionContextPort();
    const initialSnapshot = port.getWorkspaceScopeSnapshot();
    const firstSubscriber = vi.fn();
    const secondSubscriber = vi.fn();

    const unsubscribeFirst = port.subscribeWorkspaceScope(firstSubscriber);
    expect(port.getWorkspaceScopeSnapshot()).toBe(initialSnapshot);

    const unsubscribeSecond = port.subscribeWorkspaceScope(secondSubscriber);
    expect(port.getWorkspaceScopeSnapshot()).toBe(initialSnapshot);

    setWorkspaceScope(buildWorkspaceScope({ projectId: 'project-b' }));
    const projectBSnapshot = port.getWorkspaceScopeSnapshot();

    expect(projectBSnapshot).toMatchObject({ projectId: 'project-b' });
    expect(port.getWorkspaceScopeSnapshot()).toBe(projectBSnapshot);
    expect(firstSubscriber).toHaveBeenCalledTimes(1);
    expect(secondSubscriber).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    unsubscribeSecond();
  });
});
