// @vitest-environment jsdom
/** Prove Router consumption precedes the existing Code admission without extra tab state. */
import { act, StrictMode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider, useBlocker } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { CanvasCodeRouteEntry } from './CanvasCodeRouteEntry';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

async function mountEntry({
  state = { canvasWorkbench: 'code' } as unknown,
  ownerKey = 'canvas:one' as string | null,
  blocked = false,
  strict = false,
  onOpen = vi.fn(async () => true),
} = {}): Promise<{
  router: ReturnType<typeof createMemoryRouter>;
  onOpen: Mock<() => Promise<boolean>>;
  changeOwner: (key: string | null) => void;
  getBlocker: () => ReturnType<typeof useBlocker> | undefined;
}> {
  let changeOwner!: (key: string | null) => void;
  let observedBlocker: ReturnType<typeof useBlocker> | undefined;
  function Route(): JSX.Element {
    const [owner, setOwner] = useState(ownerKey);
    changeOwner = setOwner;
    observedBlocker = useBlocker(blocked);
    return <CanvasCodeRouteEntry ownerKey={owner} onOpen={onOpen} />;
  }
  const router = createMemoryRouter([{ path: '/canvas', element: <Route /> }], {
    initialEntries: [
      {
        pathname: '/canvas',
        search: '?authority=dbt-project-files&canvasId=one&projectRoot=dbt&runId=run',
        hash: '#file',
        state,
      },
    ],
  });
  await act(async () => {
    root.render(
      strict ? (
        <StrictMode>
          <RouterProvider router={router} />
        </StrictMode>
      ) : (
        <RouterProvider router={router} />
      )
    );
  });
  return {
    router,
    onOpen,
    changeOwner: (key: string | null) => changeOwner(key),
    getBlocker: () => observedBlocker,
  };
}

describe('Canvas Code route entry', () => {
  it('consumes only its request after a real Router commit and preserves URL and foreign state', async () => {
    // Replacing only history state must not invalidate the route authority or its auth admission.
    const foreign = { returnTo: '/runs' };
    const mounted = await mountEntry({ state: { canvasWorkbench: 'code', foreign } });
    expect(mounted.onOpen).toHaveBeenCalledOnce();
    expect(mounted.router.state.location).toMatchObject({
      pathname: '/canvas',
      search: '?authority=dbt-project-files&canvasId=one&projectRoot=dbt&runId=run',
      hash: '#file',
      state: { foreign },
    });
    await act(async () => {
      mounted.changeOwner('canvas:two');
    });
    expect(mounted.onOpen).toHaveBeenCalledOnce();
  });

  it('waits for a real owner and admits once under StrictMode replay', async () => {
    // The first effect must not start an admission which the owner's replay cleanup invalidates.
    const mounted = await mountEntry({ ownerKey: null, strict: true });
    expect(mounted.onOpen).not.toHaveBeenCalled();
    expect(mounted.router.state.location.state).toEqual({ canvasWorkbench: 'code' });
    await act(async () => {
      mounted.changeOwner('canvas:one');
    });
    expect(mounted.onOpen).toHaveBeenCalledOnce();
    expect(mounted.router.state.location.state).toEqual({});
  });

  it('does not dispatch when a real Router blocker rejects consumption', async () => {
    // An attempted replace is not proof that the protected navigation was admitted.
    const mounted = await mountEntry({ blocked: true });
    expect(mounted.getBlocker()?.state).toBe('blocked');
    expect(mounted.onOpen).not.toHaveBeenCalled();
    expect(mounted.router.state.location.state).toEqual({ canvasWorkbench: 'code' });
    await act(async () => {
      mounted.getBlocker()?.reset?.();
    });
    expect(mounted.onOpen).not.toHaveBeenCalled();
    await act(async () => {
      await mounted.router.navigate('/canvas', { state: { unrelated: true } });
    });
    expect(mounted.onOpen).not.toHaveBeenCalled();
  });

  it.each([null, 'code', [], { canvasWorkbench: 'model' }, { canvasWorkbench: { code: true } }])(
    'does not interpret malformed state %j as Code authority',
    async (state) => {
      const mounted = await mountEntry({ state });
      expect(mounted.onOpen).not.toHaveBeenCalled();
      expect(mounted.router.state.location.state).toEqual(state);
    }
  );

  it('does not replay a rejected Code admission', async () => {
    const onOpen = vi.fn(async () => false);
    const mounted = await mountEntry({ onOpen });
    expect(onOpen).toHaveBeenCalledOnce();
    expect(mounted.router.state.location.state).toEqual({});
    await act(async () => {
      mounted.changeOwner('canvas:two');
    });
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('discards a blocked request when its owner changes instead of retargeting it', async () => {
    // A request admitted for one Canvas must not silently become a command for another.
    const mounted = await mountEntry({ blocked: true });
    const navigate = vi.spyOn(mounted.router, 'navigate');
    await act(async () => {
      mounted.changeOwner('canvas:two');
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(mounted.onOpen).not.toHaveBeenCalled();
    await act(async () => {
      mounted.changeOwner('canvas:three');
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(mounted.onOpen).not.toHaveBeenCalled();
  });
});
