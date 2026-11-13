// @vitest-environment jsdom
/** Prevent the new header shortcuts from bypassing create-only persistence or scope lifetime. */
import { act } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createFileExplorerHarness } from './WorkspaceFileExplorer.test-support';

let h: ReturnType<typeof createFileExplorerHarness>;
let mounted: Awaited<ReturnType<typeof h.mount>> | undefined;
beforeEach(() => {
  h = createFileExplorerHarness();
});
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
});

async function begin(): Promise<void> {
  mounted = await h.mount();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'models' }));
  });
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'New file' }));
  });
  expect(screen.getByLabelText('File path')).toHaveProperty('value', 'models/');
  act(() => {
    fireEvent.change(screen.getByLabelText('File path'), { target: { value: 'models/new.sql' } });
  });
}

it('creates in the selected directory with expected absent, refreshes and opens the accepted file', async () => {
  await begin();
  expect(h.save).not.toHaveBeenCalled();
  act(() => {
    fireEvent.change(screen.getByLabelText('Initial content'), { target: { value: 'select 1' } });
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
  });
  expect(h.save).toHaveBeenCalledExactlyOnceWith({
    path: 'demo/models/new.sql',
    content: 'select 1',
    expectedRevision: { kind: 'absent' },
  });
  expect(h.list).toHaveBeenCalledOnce();
  expect(h.open).toHaveBeenCalledExactlyOnceWith('demo/models/new.sql');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('retries only refresh after publication succeeds and the file tree is unavailable', async () => {
  await begin();
  h.list.mockRejectedValueOnce(new Error('private network details'));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
  });
  expect(screen.getByRole('alert').textContent).toContain('created');
  expect(screen.getByRole('alert').textContent).not.toContain('private');
  expect(h.open).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Retry refresh' }));
  });
  expect(h.save).toHaveBeenCalledOnce();
  expect(h.open).toHaveBeenCalledOnce();
});

it.each(['tenantId', 'projectId', 'environmentId'] as const)(
  'retires a late accepted receipt after %s changes and blocks duplicate submission',
  async (field) => {
    await begin();
    let finish!: (receipt: typeof h.receipt) => void;
    h.save.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    act(() => {
      screen.getByRole('button', { name: 'Create file' }).click();
      screen.getByRole('button', { name: 'Create file' }).click();
    });
    expect(h.save).toHaveBeenCalledOnce();
    act(() => {
      h.changeScope({ [field]: 'another' });
    });
    await act(async () => {
      finish(h.receipt);
    });
    expect(h.list).not.toHaveBeenCalled();
    expect(h.open).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  }
);

it('does not open or retry a publication whose receipt identifies another listed file', async () => {
  await begin();
  h.save.mockResolvedValue({ ...h.receipt, path: 'demo/private.sql' });
  h.list.mockResolvedValue([{ path: 'demo/private.sql', name: 'private.sql', kind: 'file' }]);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
  });
  expect(h.open).not.toHaveBeenCalled();
  expect(h.list).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Create file' })).toBeNull();
  expect(h.save).toHaveBeenCalledOnce();
});

it.each([
  ['plain', "select 'España'"],
  ['BOM', "\uFEFFselect 'España'"],
])(
  'imports %s UTF-8 bytes only after confirmation through the same create-only command',
  async (_variant, content) => {
    mounted = await h.mount();
    const bytes = new TextEncoder().encode(content);
    const file = new File([bytes], 'new.sql');
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
    const input = mounted.container.querySelector('input[type="file"]')!;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(h.save).not.toHaveBeenCalled();
    expect(screen.getByLabelText('File path')).toHaveProperty('value', 'new.sql');
    act(() => {
      fireEvent.change(screen.getByLabelText('File path'), { target: { value: 'models/new.sql' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
    });
    expect(h.save).toHaveBeenCalledExactlyOnceWith({
      path: 'demo/models/new.sql',
      content,
      expectedRevision: { kind: 'absent' },
    });
  }
);

it('focuses the decoded path and returns focus to the Import action on close', async () => {
  mounted = await h.mount();
  const bytes = new TextEncoder().encode('select 1');
  const file = new File([bytes], 'new.sql');
  let finish!: (bytes: ArrayBuffer) => void;
  Object.defineProperty(file, 'arrayBuffer', {
    value: () =>
      new Promise<ArrayBuffer>((resolve) => {
        finish = resolve;
      }),
  });
  act(() => {
    fireEvent.change(mounted!.container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
  });
  expect(screen.getByLabelText('File path')).toHaveProperty('disabled', true);
  await act(async () => {
    finish(bytes.buffer);
  });
  expect(document.activeElement).toBe(screen.getByLabelText('File path'));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  });
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Import file' }))
  );
  expect(h.save).not.toHaveBeenCalled();
});
