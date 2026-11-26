// @vitest-environment jsdom
/** Recover only the selected opaque execution and keep denied history undisclosed. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, within } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SqlWorksheetHistory } from './SqlWorksheetHistory';
import {
  buildSqlWorksheetTestExecution,
  SQL_TEST_EXECUTION_ID,
} from './sqlWorksheet.test-fixtures';
import { resolveSqlWorksheetCopy } from './sqlWorksheetCopy';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});

function render(overrides: Partial<Parameters<typeof SqlWorksheetHistory>[0]> = {}): void {
  act(() =>
    root.render(
      <SqlWorksheetHistory
        executions={[buildSqlWorksheetTestExecution()]}
        loading={false}
        error={false}
        busy={false}
        canView
        hasMore={false}
        onRetry={vi.fn()}
        onMore={vi.fn()}
        onRestore={vi.fn()}
        copy={resolveSqlWorksheetCopy('en')}
        locale="en"
        {...overrides}
      />
    )
  );
}

it('recovers the exact execution identity and exposes SQL with connection and duration', () => {
  const restore = vi.fn();
  render({ onRestore: restore });
  const view = within(container);
  expect(view.getByText('SELECT 1 AS total')).toBeDefined();
  expect(view.getByText(/Succeeded · 125 ms/u)).toBeDefined();
  fireEvent.click(view.getByRole('button', { name: `Restore SQL: ${SQL_TEST_EXECUTION_ID}` }));
  expect(restore).toHaveBeenCalledExactlyOnceWith(SQL_TEST_EXECUTION_ID);
});

it('does not disclose cached SQL or permit restore when history authorization is denied', () => {
  render({ canView: false });
  expect(within(container).queryByText('SELECT 1 AS total')).toBeNull();
  expect(within(container).queryByRole('button')).toBeNull();
  expect(
    within(container).getByText('You do not have permission to view SQL execution history.')
  ).toBeDefined();
});

it('formats fractional duration with the same localized precision as current results', () => {
  const execution = { ...buildSqlWorksheetTestExecution(), durationMs: 60.11840000000666 };
  render({ executions: [execution], copy: resolveSqlWorksheetCopy('es'), locale: 'es' });
  expect(within(container).getByText('Completada · 60,12 ms')).toBeDefined();
});

it('keeps pagination and retry explicit while a pending request prevents restoration', () => {
  const retry = vi.fn();
  const more = vi.fn();
  const restore = vi.fn();
  render({
    error: true,
    hasMore: true,
    busy: true,
    onMore: more,
    onRetry: retry,
    onRestore: restore,
  });
  const view = within(container);
  expect(view.getByRole('alert').textContent).toBe('Execution history could not be loaded.');
  fireEvent.click(view.getByRole('button', { name: 'Refresh history' }));
  fireEvent.click(view.getByRole('button', { name: 'Load more' }));
  fireEvent.click(view.getByRole('button', { name: `Restore SQL: ${SQL_TEST_EXECUTION_ID}` }));
  expect(retry).toHaveBeenCalledOnce();
  expect(more).toHaveBeenCalledOnce();
  expect(restore).not.toHaveBeenCalled();
});
