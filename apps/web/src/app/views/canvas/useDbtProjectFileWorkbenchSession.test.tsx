// @vitest-environment jsdom
/** Owned concern: prove guarded handoff between the same file Code and inspector sessions. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { useDbtProjectFileWorkbenchSession } from './useDbtProjectFileWorkbenchSession';

const node: CanonicalNode = {
  id: 'orders',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
};
const setInspectorNode = vi.fn();
const showInspectorPanel = vi.fn();
const hideInspectorPanel = vi.fn();
let session: ReturnType<typeof useDbtProjectFileWorkbenchSession>;
let root: Root;
let container: HTMLDivElement;
let mounted: boolean;
type SessionInputs = Pick<Parameters<typeof useDbtProjectFileWorkbenchSession>[0], 'nodesById'> & {
  ownerKey: string;
};
const defaultInputs: SessionInputs = {
  ownerKey: 'workspace-a/canvas/project',
  nodesById: new Map([[node.id, node]]),
};
function Harness({ inputs }: { inputs: SessionInputs }): null {
  session = useDbtProjectFileWorkbenchSession({
    ...inputs,
    setInspectorNode,
    showInspectorPanel,
    hideInspectorPanel,
  });
  return null;
}
function renderSession(inputs: Partial<SessionInputs> = {}): void {
  act(() => root.render(<Harness inputs={{ ...defaultInputs, ...inputs }} />));
}
function deferredFlush(): Readonly<{
  promise: Promise<boolean>;
  resolve: (value: boolean) => void;
  reject: (error: Error) => void;
}> {
  let resolve!: (value: boolean) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<boolean>((accept, refuse) => {
    resolve = accept;
    reject = refuse;
  });
  return { promise, resolve, reject };
}
function assignEditors(
  nodeFlush: () => Promise<boolean>,
  projectFlush = vi.fn(async () => true)
): typeof projectFlush {
  Object.assign(session.nodeCodeEditorRef, { current: { flush: nodeFlush } });
  Object.assign(session.projectCodeEditorRef, { current: { flush: projectFlush } });
  return projectFlush;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mounted = true;
  renderSession();
});
afterEach(() => {
  if (mounted) act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it('flushes both editors before opening a known resource and closes project Code', async () => {
  const nodeFlush = vi.fn(async () => true);
  const projectFlush = vi.fn(async () => true);
  Object.assign(session.nodeCodeEditorRef, { current: { flush: nodeFlush } });
  Object.assign(session.projectCodeEditorRef, { current: { flush: projectFlush } });
  await act(async () => {
    await session.openProjectCode('models/orders.sql');
  });
  expect(session.projectCodeWorkbenchOpen).toBe(true);
  nodeFlush.mockClear();
  await act(async () => {
    expect(await session.openNodeWorkbench(node.id, 'columns')).toBe(true);
  });
  expect(nodeFlush).toHaveBeenCalledOnce();
  expect(projectFlush).toHaveBeenCalledOnce();
  expect(nodeFlush.mock.invocationCallOrder[0]).toBeLessThan(
    projectFlush.mock.invocationCallOrder[0]!
  );
  expect(setInspectorNode).toHaveBeenCalledExactlyOnceWith(node.id, 'columns');
  expect(showInspectorPanel).toHaveBeenCalledOnce();
  expect(session.projectCodeWorkbenchOpen).toBe(false);
});

it('keeps Code open when the current scope rejects the final Inspector transition', async () => {
  // Session scope can change before React updates this hook's owner after a pending flush.
  await act(async () => {
    await session.openProjectCode('models/orders.sql');
  });
  const pending = deferredFlush();
  assignEditors(() => pending.promise);
  let opening!: ReturnType<typeof session.openNodeWorkbench>;
  await act(async () => {
    opening = session.openNodeWorkbench(node.id);
  });
  setInspectorNode.mockReturnValueOnce(false);
  await act(async () => {
    pending.resolve(true);
    expect(await opening).toBe(false);
  });
  expect(setInspectorNode).toHaveBeenCalledExactlyOnceWith(node.id, 'general');
  expect(showInspectorPanel).not.toHaveBeenCalled();
  expect(session.projectCodeWorkbenchOpen).toBe(true);
  expect(session.projectCodeFileSelectionRequest).toEqual({ path: 'models/orders.sql' });
});

it.each(['node', 'project'])(
  'keeps inspection unchanged when the %s editor refuses handoff',
  async (refused) => {
    const nodeFlush = vi.fn(async () => refused !== 'node');
    const projectFlush = vi.fn(async () => refused !== 'project');
    Object.assign(session.nodeCodeEditorRef, { current: { flush: nodeFlush } });
    Object.assign(session.projectCodeEditorRef, { current: { flush: projectFlush } });
    await act(async () => {
      expect(await session.openNodeWorkbench(node.id)).toBe(false);
    });
    expect(setInspectorNode).not.toHaveBeenCalled();
    expect(showInspectorPanel).not.toHaveBeenCalled();
    expect(projectFlush).toHaveBeenCalledTimes(refused === 'node' ? 0 : 1);
  }
);

it('rejects an unknown identity before touching editors', async () => {
  const flush = vi.fn(async () => true);
  Object.assign(session.nodeCodeEditorRef, { current: { flush } });
  await act(async () => {
    expect(await session.openNodeWorkbench('other-project-node')).toBe(false);
  });
  expect(flush).not.toHaveBeenCalled();
  expect(setInspectorNode).not.toHaveBeenCalled();
});

it('retains the requested file when already open and accepts an explicit new selection', async () => {
  await act(async () => {
    await session.openProjectCode('models/orders.sql');
  });
  await act(async () => {
    await session.openProjectCode();
  });
  expect(session.projectCodeFileSelectionRequest).toEqual({ path: 'models/orders.sql' });
  await act(async () => {
    await session.openProjectCode('models/customers.sql');
  });
  expect(session.projectCodeFileSelectionRequest).toEqual({ path: 'models/customers.sql' });
  act(() => {
    session.closeCodeWorkbench();
  });
  expect(session.projectCodeWorkbenchOpen).toBe(false);
  await act(async () => {
    await session.openProjectCode();
  });
  expect(session.projectCodeFileSelectionRequest).toBeUndefined();
});

it('retains the inspector and rejects project Code while node flush is refused', async () => {
  const flush = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  Object.assign(session.nodeCodeEditorRef, { current: { flush } });
  await act(async () => {
    expect(await session.openProjectCode()).toBe(false);
  });
  expect(session.projectCodeWorkbenchOpen).toBe(false);
  await act(async () => {
    expect(await session.closeNodeWorkbench()).toBe(false);
  });
  expect(hideInspectorPanel).not.toHaveBeenCalled();
  await act(async () => {
    expect(await session.closeNodeWorkbench()).toBe(true);
  });
  expect(hideInspectorPanel).toHaveBeenCalledOnce();
});

it('keeps Code openness and file selection in their actual owner session', async () => {
  // Reusing the hook across Canvas/root changes must not reveal another owner's selected file.
  await act(async () => {
    await session.openProjectCode('models/orders.sql');
  });
  renderSession({ ownerKey: 'workspace-b/canvas/another-root' });
  expect(session.projectCodeWorkbenchOpen).toBe(false);
  expect(session.projectCodeFileSelectionRequest).toBeUndefined();
  renderSession();
  expect(session.projectCodeWorkbenchOpen).toBe(false);
  expect(session.projectCodeFileSelectionRequest).toBeUndefined();
});

it.each(['node', 'project'] as const)(
  'cancels a handoff when its owner changes during the %s flush',
  async (waitingEditor) => {
    // An old completion used to flush the new owner's project editor and select its old resource.
    const pending = deferredFlush();
    const nodeFlush = vi.fn(() =>
      waitingEditor === 'node' ? pending.promise : Promise.resolve(true)
    );
    const projectFlush = vi.fn(() =>
      waitingEditor === 'project' ? pending.promise : Promise.resolve(true)
    );
    assignEditors(nodeFlush, projectFlush);
    let opening!: ReturnType<typeof session.openNodeWorkbench>;
    await act(async () => {
      opening = session.openNodeWorkbench(node.id);
    });
    renderSession({ ownerKey: 'workspace-b/canvas/project' });
    const nextProjectFlush = assignEditors(vi.fn(async () => true));
    await act(async () => {
      pending.resolve(true);
      expect(await opening).toBe(false);
    });
    expect(nextProjectFlush).not.toHaveBeenCalled();
    expect(projectFlush).toHaveBeenCalledTimes(waitingEditor === 'node' ? 0 : 1);
    expect(setInspectorNode).not.toHaveBeenCalled();
    expect(showInspectorPanel).not.toHaveBeenCalled();
  }
);

it.each(['node', 'project'] as const)(
  'rechecks current membership after the %s editor settles',
  async (waitingEditor) => {
    // The same scope may revoke a resource while an editor save is in flight.
    const pending = deferredFlush();
    const nodeFlush = vi.fn(() =>
      waitingEditor === 'node' ? pending.promise : Promise.resolve(true)
    );
    const projectFlush = vi.fn(() =>
      waitingEditor === 'project' ? pending.promise : Promise.resolve(true)
    );
    assignEditors(nodeFlush, projectFlush);
    let opening!: ReturnType<typeof session.openNodeWorkbench>;
    await act(async () => {
      opening = session.openNodeWorkbench(node.id);
    });
    renderSession({ nodesById: new Map() });
    await act(async () => {
      pending.resolve(true);
      expect(await opening).toBe(false);
    });
    expect(projectFlush).toHaveBeenCalledTimes(waitingEditor === 'node' ? 0 : 1);
    expect(setInspectorNode).not.toHaveBeenCalled();
    expect(showInspectorPanel).not.toHaveBeenCalled();
  }
);

it('flushes the captured project editor rather than a replacement handle', async () => {
  // Saving one editor must not switch the second flush to a newly mounted editor mid-handoff.
  const pending = deferredFlush();
  const capturedProjectFlush = assignEditors(() => pending.promise);
  let opening!: ReturnType<typeof session.openNodeWorkbench>;
  await act(async () => {
    opening = session.openNodeWorkbench(node.id, 'code');
  });
  const replacementFlush = assignEditors(vi.fn(async () => true));
  await act(async () => {
    pending.resolve(true);
    expect(await opening).toBe(true);
  });
  expect(capturedProjectFlush).toHaveBeenCalledOnce();
  expect(replacementFlush).not.toHaveBeenCalled();
  expect(setInspectorNode).toHaveBeenCalledExactlyOnceWith(node.id, 'code');
});

it.each(['openProjectCode', 'closeCodeWorkbench', 'closeNodeWorkbench'] as const)(
  'lets a newer %s intent supersede a pending inspection',
  async (newerIntent) => {
    // A late save must not reopen Properties over the user's later navigation or close action.
    const pending = deferredFlush();
    const nodeFlush = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(true);
    const projectFlush = assignEditors(nodeFlush);
    let opening!: ReturnType<typeof session.openNodeWorkbench>;
    await act(async () => {
      opening = session.openNodeWorkbench(node.id);
    });
    await act(async () => {
      await session[newerIntent]();
      pending.resolve(true);
      expect(await opening).toBe(false);
    });
    expect(projectFlush).not.toHaveBeenCalled();
    expect(setInspectorNode).not.toHaveBeenCalled();
    expect(showInspectorPanel).not.toHaveBeenCalled();
    expect(session.projectCodeWorkbenchOpen).toBe(newerIntent === 'openProjectCode');
  }
);

it('invalidates the first owner session after an A to B to A transition', async () => {
  // Comparing only the final layout key lets a completion from the abandoned A session through.
  const pending = deferredFlush();
  const projectFlush = assignEditors(() => pending.promise);
  let opening!: ReturnType<typeof session.openNodeWorkbench>;
  await act(async () => {
    opening = session.openNodeWorkbench(node.id);
  });
  renderSession({ ownerKey: 'workspace-b/canvas/project' });
  renderSession();
  await act(async () => {
    pending.resolve(true);
    expect(await opening).toBe(false);
  });
  expect(projectFlush).not.toHaveBeenCalled();
  expect(setInspectorNode).not.toHaveBeenCalled();
});

it('rejects an old owner callback before flushing any editor', async () => {
  // Retained callers must not turn an old callback into a new owner's intent.
  const oldOpen = session.openNodeWorkbench;
  const nodeFlush = vi.fn(async () => true);
  const projectFlush = assignEditors(nodeFlush);
  renderSession({ ownerKey: 'workspace-b/canvas/project' });
  await act(async () => {
    expect(await oldOpen(node.id)).toBe(false);
  });
  expect(nodeFlush).not.toHaveBeenCalled();
  expect(projectFlush).not.toHaveBeenCalled();
  expect(setInspectorNode).not.toHaveBeenCalled();
});

it('publishes only the newer inspection after its own editor flushes complete', async () => {
  // Two inspection gestures may share an editor, but the earlier save completion cannot replace the newer tab request.
  const pending = deferredFlush();
  const projectFlush = assignEditors(
    vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(true)
  );
  let earlier!: ReturnType<typeof session.openNodeWorkbench>;
  await act(async () => {
    earlier = session.openNodeWorkbench(node.id, 'code');
  });
  await act(async () => {
    expect(await session.openNodeWorkbench(node.id, 'columns')).toBe(true);
    pending.resolve(true);
    expect(await earlier).toBe(false);
  });
  expect(projectFlush).toHaveBeenCalledOnce();
  expect(setInspectorNode).toHaveBeenCalledExactlyOnceWith(node.id, 'columns');
  expect(showInspectorPanel).toHaveBeenCalledOnce();
});

it('cancels an inspection when the session unmounts during a flush', async () => {
  // Completing a save after teardown cannot reopen a destroyed Inspector or its next editor.
  const pending = deferredFlush();
  const projectFlush = assignEditors(() => pending.promise);
  let opening!: ReturnType<typeof session.openNodeWorkbench>;
  await act(async () => {
    opening = session.openNodeWorkbench(node.id);
  });
  act(() => root.unmount());
  mounted = false;
  await act(async () => {
    pending.resolve(true);
    expect(await opening).toBe(false);
  });
  expect(projectFlush).not.toHaveBeenCalled();
  expect(setInspectorNode).not.toHaveBeenCalled();
});

it.each(['node', 'project'] as const)(
  'propagates a current %s flush failure without opening Properties',
  async (failingEditor) => {
    // Current failures belong to the existing visible caller; swallowing them would hide a failed save.
    const error = new Error('Save failed');
    assignEditors(
      vi.fn(async () => {
        if (failingEditor === 'node') throw error;
        return true;
      }),
      vi.fn(async () => {
        if (failingEditor === 'project') throw error;
        return true;
      })
    );
    await act(async () => {
      await expect(session.openNodeWorkbench(node.id)).rejects.toBe(error);
    });
    expect(setInspectorNode).not.toHaveBeenCalled();
    expect(showInspectorPanel).not.toHaveBeenCalled();
  }
);

it.each(['node', 'project'] as const)(
  'cancels a stale %s flush failure without reporting it in the next owner',
  async (failingEditor) => {
    // A failed save from A must not surface a toast or an unhandled rejection in B.
    const pending = deferredFlush();
    assignEditors(
      vi.fn(() => (failingEditor === 'node' ? pending.promise : Promise.resolve(true))),
      vi.fn(() => (failingEditor === 'project' ? pending.promise : Promise.resolve(true)))
    );
    let opening!: ReturnType<typeof session.openNodeWorkbench>;
    await act(async () => {
      opening = session.openNodeWorkbench(node.id);
    });
    renderSession({ ownerKey: 'workspace-b/canvas/project' });
    await act(async () => {
      pending.reject(new Error('Old save failed'));
      expect(await opening).toBe(false);
    });
    expect(setInspectorNode).not.toHaveBeenCalled();
    expect(showInspectorPanel).not.toHaveBeenCalled();
  }
);

it.each(['openProjectCode', 'closeNodeWorkbench'] as const)(
  'cancels %s when its owner changes during node flush',
  async (action) => {
    // Scope fences apply to every existing async session transition, including close/focus admission.
    const pending = deferredFlush();
    assignEditors(() => pending.promise);
    let completion!: ReturnType<(typeof session)[typeof action]>;
    await act(async () => {
      completion = session[action]();
    });
    renderSession({ ownerKey: 'workspace-b/canvas/project' });
    await act(async () => {
      pending.resolve(true);
      expect(await completion).toBe(false);
    });
    expect(session.projectCodeWorkbenchOpen).toBe(false);
    expect(hideInspectorPanel).not.toHaveBeenCalled();
  }
);
