// @vitest-environment jsdom
/** Show captured execution facts and distinguish current rows from history-only metadata. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { within } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SqlWorksheetResults } from './SqlWorksheetResults';
import { buildSqlWorksheetTestResponse } from './sqlWorksheet.test-fixtures';
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

function render(overrides: Partial<Parameters<typeof SqlWorksheetResults>[0]> = {}): void {
  const response = buildSqlWorksheetTestResponse();
  act(() =>
    root.render(
      <SqlWorksheetResults
        execution={response.execution}
        result={response.result ?? null}
        busy={false}
        stale={false}
        failure={null}
        copy={resolveSqlWorksheetCopy('en')}
        locale="en"
        {...overrides}
      />
    )
  );
}

it('shows actual result cells and complete captured execution metadata', () => {
  render({ stale: true });
  const view = within(container);
  expect(view.getByRole('table', { name: 'Results' })).toBeDefined();
  expect(view.getByRole('cell', { name: '1' })).toBeDefined();
  expect(view.getByText('125 ms')).toBeDefined();
  expect(view.getByText('principal')).toBeDefined();
  expect(
    view.getByText('The buffer or connection has changed since this execution.')
  ).toBeDefined();
  expect(view.getByText('Execution metadata')).toBeDefined();
});

it('shows a history receipt without claiming historic row values are persisted', () => {
  render({ result: null });
  const view = within(container);
  expect(view.queryByRole('table')).toBeNull();
  expect(
    view.getByText(
      'Only execution metadata is kept in history. Run this SQL again for current rows.'
    )
  ).toBeDefined();
  expect(view.getByText('Succeeded')).toBeDefined();
});

it('presents failure and truncation facts independently of transport availability', () => {
  const execution = buildSqlWorksheetTestResponse().execution;
  render({
    execution: {
      ...execution,
      status: 'failed',
      rowCount: 0,
      truncated: false,
      columns: [],
      error: { code: 'query_failed', message: 'relation missing' },
    },
    result: null,
  });
  expect(within(container).getByRole('alert').textContent).toBe('relation missing');
  expect(within(container).getByText('Failed')).toBeDefined();
  render({ execution: { ...execution, status: 'succeeded', truncated: true }, failure: 'denied' });
  expect(
    within(container).getByText('The result was limited; additional rows may exist.')
  ).toBeDefined();
  expect(within(container).getByRole('alert').textContent).toBe(
    'You do not have permission to execute SQL in this workspace.'
  );
});
