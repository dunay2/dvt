// @vitest-environment jsdom
/** Prove independent SQL controls require a real connection and resolve visible copy. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, within } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import { SqlWorksheetToolbar, type SqlWorksheetToolbarProps } from './SqlWorksheetToolbar';
import { resolveSqlWorksheetCopy } from './sqlWorksheetCopy';
import type { SqlWorksheetConnection } from './sqlWorksheet.types';

let container: HTMLDivElement;
let root: Root;
const connections: readonly SqlWorksheetConnection[] = [
  { id: 'pg', name: 'Local warehouse', type: 'postgres', database: 'analytics' },
];
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function renderToolbar(
  overrides: Partial<SqlWorksheetToolbarProps> = {},
  language: ApplicationLanguage = 'en'
): void {
  const props: SqlWorksheetToolbarProps = {
    copy: resolveSqlWorksheetCopy(language),
    connections,
    connectionId: null,
    onConnectionChange: vi.fn(),
    busy: false,
    canRun: true,
    limit: 100,
    onLimitChange: vi.fn(),
    onRun: vi.fn(),
    onToggleExplorer: vi.fn(),
    actions: <span>File actions</span>,
    ...overrides,
  };
  act(() => root.render(<SqlWorksheetToolbar {...props} />));
}

it('keeps execution unavailable without a selected supported connection', () => {
  const run = vi.fn();
  renderToolbar({ onRun: run });
  const button = within(container).getByRole('button', { name: 'Run query' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(run).not.toHaveBeenCalled();
  expect(within(container).getByText('File actions')).toBeDefined();
});

it('selects only existing supported connection identities and ignores foreign values', () => {
  const select = vi.fn();
  renderToolbar({ onConnectionChange: select });
  const picker = within(container).getByRole('combobox', { name: 'Connection' });
  fireEvent.change(picker, { target: { value: 'pg' } });
  expect(select).toHaveBeenCalledExactlyOnceWith('pg');
  const foreign = document.createElement('option');
  foreign.value = 'snow';
  picker.append(foreign);
  fireEvent.change(picker, { target: { value: 'snow' } });
  expect(select).toHaveBeenCalledTimes(1);
  expect(picker.querySelector('option[value="pg"]')).not.toBeNull();
});

it('exposes Spanish connection, limit and execution controls without a Model selection', () => {
  const run = vi.fn();
  renderToolbar({ connectionId: 'pg', onRun: run }, 'es');
  expect(within(container).getByRole('combobox', { name: 'Conexión' })).toBeDefined();
  expect(within(container).getByRole('spinbutton', { name: 'Límite de filas' })).toBeDefined();
  const button = within(container).getByRole('button', { name: 'Ejecutar consulta' });
  fireEvent.click(button);
  expect(run).toHaveBeenCalledOnce();
});
