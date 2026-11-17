// @vitest-environment jsdom
/** Prove project Explorer continuity across retained surfaces and scope replacement. */
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  CanvasModelBrowserProvider,
  useCanvasModelBrowserPresentation,
} from '../CanvasModelBrowser';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerList } from './CanvasExplorerList';
import type { CanvasExplorerCatalogPresentation } from './CanvasExplorer.types';

let root: Root;
let host: HTMLDivElement;
let activePresentation: CanvasExplorerCatalogPresentation | undefined;
const items = [
  { id: 'orders', label: 'Orders', details: [{ label: 'object' as const, value: 'raw.orders' }] },
  { id: 'customers', label: 'Customers' },
];
function Surface(): JSX.Element {
  const presentation = useCanvasModelBrowserPresentation()?.cataloguePresentation;
  activePresentation = presentation;
  const [surface, setSurface] = useState('canvas');
  return (
    <>
      <button onClick={() => setSurface('canvas')}>Canvas</button>
      <CanvasExplorerList
        key={surface}
        items={items}
        presentation={presentation}
        onSelect={setSurface}
      />
    </>
  );
}
function render(projectId = 'project', canvasId = 'canvas'): void {
  act(() =>
    root.render(
      <CanvasModelBrowserProvider
        nodes={[]}
        canvasId={canvasId}
        active={true}
        workspaceScope={{
          tenantId: 'tenant',
          projectId,
          environmentId: 'dev',
          targetAdapter: 'temporal',
        }}
        navigation={{
          mode: 'semantic',
          onSelect: vi.fn(),
          contexts: [],
          selectContext: vi.fn(),
          cancelContext: vi.fn(),
        }}
      >
        <Surface />
      </CanvasModelBrowserProvider>
    )
  );
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  useApplicationLanguageStore.setState({ language: 'en' });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it('retains filtering and details when opening Models and returning to the Canvas', () => {
  render();
  act(() => fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Orders' } }));
  act(() => fireEvent.click(screen.getByRole('button', { name: 'Details: Orders' })));
  act(() => fireEvent.click(screen.getByRole('button', { name: 'Orders' })));
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Orders');
  expect(screen.queryByRole('button', { name: 'Customers' })).toBeNull();
  expect(screen.getByText('raw.orders')).toBeTruthy();
  act(() => fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Customers' } }));
  act(() => fireEvent.click(screen.getByRole('button', { name: 'Customers' })));
  act(() => fireEvent.click(screen.getByRole('button', { name: 'Canvas' })));
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Customers');
  act(() => fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Orders' } }));
  expect(
    screen.getByRole('button', { name: 'Details: Orders' }).getAttribute('aria-expanded')
  ).toBe('true');
});

it.each([
  ['another-project', 'canvas'],
  ['project', 'another-canvas'],
])('resets filter and detail state for scope %s / %s', (projectId, canvasId) => {
  render();
  act(() => fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Orders' } }));
  act(() => fireEvent.click(screen.getByRole('button', { name: 'Details: Orders' })));
  const obsolete = activePresentation!;
  render(projectId, canvasId);
  act(() => {
    obsolete.onQuery('obsolete');
    obsolete.onOpenChange(false);
    obsolete.onToggleDetails('orders');
  });
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  expect(
    screen.getByRole('button', { name: 'Details: Orders' }).getAttribute('aria-expanded')
  ).toBe('false');
});
