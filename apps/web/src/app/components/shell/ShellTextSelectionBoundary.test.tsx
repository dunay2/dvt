// @vitest-environment jsdom
/** Owned concern: selected text must never become a graph or browser context action. */
import { act, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, waitFor, within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShellFrame } from './AppShellFrame';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

let host: HTMLDivElement;
let root: Root;
const frame = {
  bottomDrawer: null,
  bottomDrawerHeight: 300,
  onBottomDrawerHeightChange: vi.fn(),
  focusMode: false,
  leftNavigation: null,
  showBottomDrawer: false,
  skipToMainContentLabel: 'Skip',
  topBar: null,
};
function select(element: Element): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}
async function mount(children: ReactNode): Promise<void> {
  await act(async () => root.render(<AppShellFrame {...frame}>{children}</AppShellFrame>));
}
async function open(element: HTMLElement): Promise<HTMLElement> {
  element.focus();
  select(element);
  await act(async () => fireEvent.contextMenu(element, { clientX: 140, clientY: 120 }));
  return within(document.body).getByRole('menu', { name: 'Selected text' });
}
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  useApplicationLanguageStore.setState({ language: 'en' });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.getSelection()?.removeAllRanges();
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shell selected-text intent', () => {
  it('keeps selection passive, then copies exact selected text without reaching the target action', async () => {
    // The old shell only suppressed the native default, leaving no application text actions.
    const targetAction = vi.fn();
    await mount(
      <div tabIndex={0} onContextMenu={targetAction}>
        {'  customer orders  '}
      </div>
    );
    const text = host.querySelector('[tabindex="0"]') as HTMLElement;
    select(text);
    expect(within(document.body).queryByRole('menu')).toBeNull();
    const menu = await open(text);
    expect(targetAction).not.toHaveBeenCalled();
    expect(within(menu).getByRole('menuitem', { name: 'Copy' })).toBe(document.activeElement);
    await act(async () => fireEvent.click(within(menu).getByRole('menuitem', { name: 'Copy' })));
    expect(navigator.clipboard.writeText).toHaveBeenCalledExactlyOnceWith('  customer orders  ');
    expect(within(menu).getByRole('status').textContent).toContain('Copied');
    expect(document.getSelection()?.toString()).toBe('  customer orders  ');
  });

  it.each(['ContextMenu', 'F10'])(
    'opens through %s and restores the real opener on Escape',
    async (key) => {
      // Keyboard context must not fall through to Canvas Add while text is selected.
      const graphKey = vi.fn();
      await mount(
        <div tabIndex={0} onKeyDown={graphKey}>
          model
        </div>
      );
      const text = host.querySelector('[tabindex="0"]') as HTMLElement;
      text.focus();
      select(text);
      await act(async () => fireEvent.keyDown(text, { key, shiftKey: key === 'F10' }));
      const menu = within(document.body).getByRole('menu', { name: 'Selected text' });
      expect(graphKey).not.toHaveBeenCalled();
      await act(async () => fireEvent.keyDown(menu, { key: 'ArrowDown' }));
      expect(document.activeElement?.textContent).toContain('Dictionary');
      await act(async () => fireEvent.keyDown(document.activeElement!, { key: 'Escape' }));
      expect(within(document.body).queryByRole('menu')).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(text));
    }
  );

  it('delegates ordinary target and Monaco menus unchanged when selection is not owned', async () => {
    // A global capture cancellation previously broke Radix target menus; only text intent may preempt them.
    const ordinary = vi.fn();
    const editor = vi.fn();
    await mount(
      <>
        <button onContextMenu={ordinary}>Graph action</button>
        <div className="monaco-editor" onContextMenu={editor}>
          <span>SQL</span>
        </div>
      </>
    );
    await act(async () =>
      fireEvent.contextMenu(within(host).getByRole('button', { name: 'Graph action' }))
    );
    const sql = host.querySelector('.monaco-editor span')!;
    select(sql);
    await act(async () => fireEvent.contextMenu(sql));
    expect(ordinary).toHaveBeenCalledOnce();
    expect(editor).toHaveBeenCalledOnce();
    expect(within(document.body).queryByRole('menu')).toBeNull();
  });

  it('covers React portal text without listening to the document outside the shell', async () => {
    // Drawer/dialog portals must share the shell policy rather than acquire per-view click handlers.
    await mount(
      createPortal(
        <div tabIndex={0} data-testid="portal-text">
          warehouse
        </div>,
        document.body
      )
    );
    const text = within(document.body).getByTestId('portal-text');
    const menu = await open(text);
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);
    await act(async () => fireEvent.keyDown(menu, { key: 'Escape' }));
    const outside = document.createElement('span');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    select(outside);
    expect(fireEvent.contextMenu(outside)).toBe(true);
    expect(within(document.body).queryByRole('menu')).toBeNull();
    outside.remove();
  });

  it('reports clipboard denial and rejects a stale snapshot without a fake success', async () => {
    // An ignored clipboard promise would falsely report success or create an unhandled rejection.
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
    await mount(<div tabIndex={0}>customer</div>);
    const text = host.querySelector('[tabindex="0"]') as HTMLElement;
    const menu = await open(text);
    const copy = within(menu).getByRole('menuitem', { name: 'Copy' });
    await act(async () => fireEvent.click(copy));
    expect(within(menu).getByRole('status').textContent).toContain('Could not copy');
    text.textContent = 'different';
    await act(async () => fireEvent.click(copy));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(within(menu).getByRole('status').textContent).toContain('Select the text again');
  });
});
