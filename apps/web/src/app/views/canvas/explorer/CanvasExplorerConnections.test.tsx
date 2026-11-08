// @vitest-environment jsdom
/** Owned concern: connection metadata presentation never invents health or resolved counts. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import {
  CanvasExplorerConnections,
  type CanvasExplorerConnectionState,
} from './CanvasExplorerConnections';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  useApplicationLanguageStore.setState({ language: 'en' });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
const connection = {
  id: 'shared-project-connection',
  name: 'Warehouse North',
  type: 'postgres',
  database: 'analytics',
} as const;
function show(
  state: CanvasExplorerConnectionState,
  onManage?: () => void,
  onRetry?: () => void
): void {
  act(() =>
    root.render(<CanvasExplorerConnections state={state} onManage={onManage} onRetry={onRetry} />)
  );
}
function expand(): void {
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Connections' }));
  });
}

it('distinguishes unavailable, idle, loading, denied and resolved empty without false counts', () => {
  // A missing/denied query previously looked like a successful empty catalogue.
  show({ status: 'unavailable' });
  expand();
  expect(screen.getByText('Connections are unavailable in this workspace.')).toBeTruthy();
  expect(container.querySelector('[data-slot="canvas-explorer-connection-count"]')).toBeNull();
  show({ status: 'idle' });
  expect(screen.getByText('Connections have not been loaded.')).toBeTruthy();
  show({ status: 'loading' });
  expect(screen.getByRole('status').textContent).toBe('Loading connections…');
  show({ status: 'error', message: 'Access denied for this project.' });
  expect(screen.getByRole('alert').textContent).toBe('Access denied for this project.');
  expect(container.querySelector('[data-slot="canvas-explorer-connection-count"]')).toBeNull();
  show({ status: 'ready', connections: [], refreshing: false });
  expect(screen.getByText('No connections configured.')).toBeTruthy();
  expect(
    container.querySelector('[data-slot="canvas-explorer-connection-count"]')?.textContent
  ).toBe('0');
});

it('retains successful rows during refresh failure and delegates explicit retry only', () => {
  // Background refresh errors must not erase usable scoped metadata or silently claim success.
  const onRetry = vi.fn();
  show({ status: 'ready', connections: [connection], refreshing: true });
  expand();
  expect(screen.getByRole('status').textContent).toBe('Refreshing connections…');
  show(
    {
      status: 'ready',
      connections: [connection],
      refreshing: false,
      refreshErrorMessage: 'Refresh rejected.',
    },
    undefined,
    onRetry
  );
  expect(screen.getByRole('button', { name: 'Warehouse North' })).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toBe('Refresh rejected.');
  expect(
    container.querySelector('[data-slot="canvas-explorer-connection-count"]')?.textContent
  ).toBe('1');
  expect(onRetry).not.toHaveBeenCalled();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  });
  expect(onRetry).toHaveBeenCalledExactlyOnceWith();
});

it('keeps disclosure, local selection and management independent with metadata-only details', () => {
  // Expanding a connection must not configure/test it or expose fields outside its public DTO.
  const onManage = vi.fn();
  show({ status: 'ready', connections: [connection], refreshing: false }, onManage);
  expand();
  const row = screen.getByRole('button', { name: 'Warehouse North' });
  const details = screen.getByRole('button', { name: 'Details: Warehouse North' });
  act(() => {
    details.focus();
    fireEvent.click(details);
  });
  expect(details.getAttribute('aria-expanded')).toBe('true');
  expect(row.getAttribute('aria-pressed')).toBe('false');
  expect(document.activeElement).toBe(details);
  expect(document.getElementById(details.getAttribute('aria-controls')!)?.textContent).toContain(
    'analytics'
  );
  expect(onManage).not.toHaveBeenCalled();
  act(() => {
    fireEvent.click(row);
  });
  expect(row.getAttribute('aria-pressed')).toBe('true');
  expect(details.getAttribute('aria-expanded')).toBe('true');
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Configure connections' }));
  });
  expect(onManage).toHaveBeenCalledExactlyOnceWith();
  expect(container.querySelector('button button')).toBeNull();
  expect(container.textContent).not.toMatch(/healthy|online|credential/i);
});

it('keeps connection details readable in Spanish when management is unavailable', () => {
  // Viewing shared metadata does not require a writable import command.
  act(() => {
    useApplicationLanguageStore.setState({ language: 'es' });
  });
  show({ status: 'ready', connections: [connection], refreshing: false });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Conexiones' }));
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Detalles: Warehouse North' }));
  });
  expect(
    (screen.getByRole('button', { name: 'Configurar conexiones' }) as HTMLButtonElement).disabled
  ).toBe(true);
  expect(screen.getByText('Base de datos')).toBeTruthy();
});
