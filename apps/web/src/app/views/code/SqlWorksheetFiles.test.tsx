// @vitest-environment jsdom
/** Exercise the file picker with real query caching and the managed Git history component. */
import { sha256HexUtf8 } from '@dvt/crypto';
import { fireEvent, screen } from '@testing-library/dom';
import { act } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { createMockSessionContextPort } from '../../../testing/runsPortDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { SqlWorksheetFiles } from './SqlWorksheetFiles';

const path = 'operations/quarter.sql';
const sql = 'select 42';
const digest = sha256HexUtf8(sql);
const file = {
  path,
  content: sql,
  contentSha256: digest,
  lastModified: '',
  name: 'quarter.sql',
  language: 'sql',
};
let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
});

async function mount() {
  const sessionContext = createMockSessionContextPort();
  const scope = sessionContext.getWorkspaceScopeSnapshot();
  const open = vi.fn();
  const read = vi.fn().mockResolvedValue(file);
  const save = vi
    .fn()
    .mockResolvedValue({
      kind: 'saved',
      disposition: 'created',
      path,
      contentSha256: digest,
      lastModified: '',
    });
  const history = vi.fn().mockResolvedValue([]);
  const tree = vi.fn().mockResolvedValue([{ path, name: 'quarter.sql', kind: 'file' }]);
  const overrides = {
    ...createAppServicesTestOverrides(),
    sessionContext,
    workspaceFilesQuery: { getFileContent: read, listFiles: tree },
    workspaceFileContentCommand: { saveFileContent: save },
    workspaceFileHistoryQuery: { getFileHistory: history, getFileVersionContent: vi.fn() },
  };
  const view = (text: string) => (
    <AppServicesProvider overrides={overrides}>
      <SqlWorksheetFiles sql={text} scope={scope} onSqlChange={open} />
    </AppServicesProvider>
  );
  mounted = await withTestQueryClient(view(sql));
  const edit = (text: string) => mounted!.render(view(text));
  return { open, read, save, history, tree, edit };
}

async function openDialog() {
  act(() => screen.getByRole('button', { name: 'SQL files and Git' }).click());
  await waitForReactQuery(() => screen.queryByRole('option', { name: path }) != null);
  act(() => fireEvent.change(screen.getByRole('combobox'), { target: { value: path } }));
}

it('starts with no file IO and only shows Git history for an explicitly opened file', async () => {
  const h = await mount();
  expect(h.tree).not.toHaveBeenCalled();
  await openDialog();
  expect(h.read).not.toHaveBeenCalled();
  expect(h.history).not.toHaveBeenCalled();
  await act(async () => screen.getByRole('button', { name: 'Replace editor text' }).click());
  expect(h.open).toHaveBeenCalledExactlyOnceWith(sql);
  await waitForReactQuery(() => h.history.mock.calls.length > 0);
  expect(h.history.mock.calls[0]?.[0]).toBe(path);
  expect(h.save).not.toHaveBeenCalled();
});

it('preserves newer editor input when the selected file reply arrives late', async () => {
  const h = await mount();
  let resolve!: (value: typeof file) => void;
  h.read.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      })
  );
  await openDialog();
  act(() => screen.getByRole('button', { name: 'Replace editor text' }).click());
  await h.edit('select 43');
  await act(async () => {
    resolve(file);
  });
  expect(h.open).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toContain('editor changed');
});

it('saves once under a new name and uses the original digest on subsequent edits', async () => {
  const h = await mount();
  await openDialog();
  act(() =>
    fireEvent.change(screen.getByLabelText('Save in operations/'), {
      target: { value: 'quarter.sql' },
    })
  );
  await act(async () => {
    const save = screen.getByRole('button', { name: 'Save query' });
    save.click();
    save.click();
  });
  expect(h.save).toHaveBeenCalledExactlyOnceWith({
    path,
    content: sql,
    expectedRevision: { kind: 'absent' },
  });
  await h.edit('select 43');
  await act(async () => screen.getByRole('button', { name: 'Save query' }).click());
  expect(h.save).toHaveBeenLastCalledWith({
    path,
    content: 'select 43',
    expectedRevision: { kind: 'content_sha256', value: digest },
  });
  expect(screen.getByRole('alert').textContent).toContain('could not be confirmed');
});
