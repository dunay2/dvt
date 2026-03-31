// @vitest-environment jsdom

import { createElement } from 'react';
import { notifyManager } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { waitForReactQuery, withTestQueryClient } from './reactQueryHarness';

describe('waitForReactQuery', () => {
  it('does not execute controlled ticks when predicate is already satisfied', async () => {
    const tick = vi.fn();

    await waitForReactQuery(() => true, {
      tick,
      intervalMs: 1,
      timeoutMs: 100,
    });

    expect(tick).not.toHaveBeenCalled();
  });

  it('supports multi-step controlled polling without real timers', async () => {
    let pollAttempts = 0;
    let settled = false;

    await waitForReactQuery(() => settled, {
      description: 'controlled multi-step state',
      intervalMs: 10,
      tick: () => {
        pollAttempts += 1;

        if (pollAttempts === 3) {
          settled = true;
        }
      },
      timeoutMs: 50,
    });

    expect(pollAttempts).toBe(3);
  });

  it('accepts success on the last allowed controlled tick', async () => {
    let pollAttempts = 0;
    let settled = false;

    await waitForReactQuery(() => settled, {
      description: 'last allowed controlled tick state',
      intervalMs: 10,
      tick: () => {
        pollAttempts += 1;

        if (pollAttempts === 3) {
          settled = true;
        }
      },
      timeoutMs: 30,
    });

    expect(pollAttempts).toBe(3);
  });
});

describe('withTestQueryClient', () => {
  it('restores a custom notify function set before the first harness lease', async () => {
    const baselineChildren = document.body.childElementCount;

    try {
      vi.resetModules();
      const { notifyManager: freshNotifyManager } = await import('@tanstack/react-query');
      const { withTestQueryClient: freshWithTestQueryClient } = await import('./reactQueryHarness');
      const notifications: string[] = [];

      freshNotifyManager.setNotifyFunction((callback) => {
        notifications.push('custom-before-first-lease');
        callback();
      });

      const mounted = await freshWithTestQueryClient(createElement('div'));

      await mounted.cleanup();

      const scheduledCallback = freshNotifyManager.batchCalls(() => {
        notifications.push('callback');
      });

      scheduledCallback();
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

      expect(notifications).toEqual(['custom-before-first-lease', 'callback']);
      expect(document.body.childElementCount).toBe(baselineChildren);
    } finally {
      notifyManager.setNotifyFunction((callback) => {
        callback();
      });
      vi.resetModules();

      while (document.body.childElementCount > baselineChildren) {
        document.body.lastElementChild?.remove();
      }
    }
  });

  it('restores global act env and dom when initial render fails', async () => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    const baselineChildren = document.body.childElementCount;
    globalObject.IS_REACT_ACT_ENVIRONMENT = false;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = (event: ErrorEvent) => {
      if (event.error instanceof Error && event.error.message === 'boom') {
        event.preventDefault();
      }
    };
    window.addEventListener('error', onError);

    function ThrowOnRender(): null {
      throw new Error('boom');
    }

    try {
      await expect(withTestQueryClient(createElement(ThrowOnRender))).rejects.toThrow('boom');
      expect(globalObject.IS_REACT_ACT_ENVIRONMENT).toBe(false);
      expect(document.body.childElementCount).toBe(baselineChildren);
    } finally {
      while (document.body.childElementCount > baselineChildren) {
        document.body.lastElementChild?.remove();
      }

      window.removeEventListener('error', onError);
      consoleError.mockRestore();

      if (previousActEnvironment === undefined) {
        Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
      } else {
        globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      }
    }
  });

  it('propagates cleanup errors while still restoring global act env and dom', async () => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    const baselineChildren = document.body.childElementCount;
    globalObject.IS_REACT_ACT_ENVIRONMENT = false;
    const mockRoot = {
      render: vi.fn(),
      unmount: vi.fn(() => {
        throw new Error('cleanup boom');
      }),
    };

    try {
      vi.resetModules();
      vi.doMock('react-dom/client', async () => {
        const actual = await vi.importActual<typeof import('react-dom/client')>('react-dom/client');

        return {
          ...actual,
          createRoot: () => mockRoot,
        };
      });

      const { withTestQueryClient: withMockedHarness } = await import('./reactQueryHarness');
      const mounted = await withMockedHarness(createElement('div'));

      await expect(mounted.cleanup()).rejects.toThrow('cleanup boom');
      expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
      expect(globalObject.IS_REACT_ACT_ENVIRONMENT).toBe(false);
      expect(document.body.childElementCount).toBe(baselineChildren);
    } finally {
      vi.doUnmock('react-dom/client');
      vi.resetModules();

      while (document.body.childElementCount > baselineChildren) {
        document.body.lastElementChild?.remove();
      }

      if (previousActEnvironment === undefined) {
        Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
      } else {
        globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      }
    }
  });

  it('keeps React act mode enabled until the last overlapping harness is cleaned up', async () => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    const baselineChildren = document.body.childElementCount;
    globalObject.IS_REACT_ACT_ENVIRONMENT = false;

    const firstHarness = await withTestQueryClient(createElement('div'));
    const secondHarness = await withTestQueryClient(createElement('div'));

    try {
      expect(globalObject.IS_REACT_ACT_ENVIRONMENT).toBe(true);

      await firstHarness.cleanup();
      expect(globalObject.IS_REACT_ACT_ENVIRONMENT).toBe(true);

      await secondHarness.cleanup();
      expect(globalObject.IS_REACT_ACT_ENVIRONMENT).toBe(false);
      expect(document.body.childElementCount).toBe(baselineChildren);
    } finally {
      while (document.body.childElementCount > baselineChildren) {
        document.body.lastElementChild?.remove();
      }

      if (previousActEnvironment === undefined) {
        Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
      } else {
        globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      }
    }
  });

  it('restores a prior React Query notify function after cleanup', async () => {
    const baselineChildren = document.body.childElementCount;
    const notifications: string[] = [];

    notifyManager.setNotifyFunction((callback) => {
      notifications.push('custom-notify');
      callback();
    });

    const mounted = await withTestQueryClient(createElement('div'));

    try {
      await mounted.cleanup();

      const scheduledCallback = notifyManager.batchCalls(() => {
        notifications.push('callback');
      });

      scheduledCallback();
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));

      expect(notifications).toEqual(['custom-notify', 'callback']);
      expect(document.body.childElementCount).toBe(baselineChildren);
    } finally {
      notifyManager.setNotifyFunction((callback) => {
        callback();
      });

      while (document.body.childElementCount > baselineChildren) {
        document.body.lastElementChild?.remove();
      }
    }
  });
});
