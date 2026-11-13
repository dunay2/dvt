// @vitest-environment jsdom
/** Protect file authority, safe diagnostics and lossless text import at the new UI entry point. */
import { act } from 'react';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/createApiClient';
import { WorkspaceFileRevisionConflictError } from '../../services/workspace/workspaceErrors';
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

it.each(['../outside.sql', '/outside.sql', '%2e%2e/outside.sql'])(
  'refuses a destination outside the displayed project: %s',
  async (path) => {
    mounted = await h.mount();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'New file' }));
    });
    act(() => {
      fireEvent.change(screen.getByLabelText('File path'), { target: { value: path } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
    });
    expect(screen.getByRole('alert').textContent).toContain('relative');
    expect(h.save).not.toHaveBeenCalled();
    expect(h.open).not.toHaveBeenCalled();
  }
);

it.each([
  [new WorkspaceFileRevisionConflictError('demo/new.sql'), 'already exists'],
  [
    new ApiError({
      message: 'PRIVATE_CREDENTIAL',
      endpoint: '/workspace/files',
      statusCode: 403,
      category: 'forbidden',
    }),
    'permission',
  ],
] as const)('retains the draft after a refused command with safe copy', async (error, message) => {
  h.save.mockRejectedValue(error);
  mounted = await h.mount();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'New file' }));
  });
  act(() => {
    fireEvent.change(screen.getByLabelText('File path'), { target: { value: 'new.sql' } });
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
  });
  expect(screen.getByRole('alert').textContent).toContain(message);
  expect(screen.getByRole('alert').textContent).not.toContain('PRIVATE');
  expect(screen.getByLabelText('File path')).toHaveProperty('value', 'new.sql');
  expect(h.save.mock.calls[0]?.[0].expectedRevision).toEqual({ kind: 'absent' });
  expect(h.open).not.toHaveBeenCalled();
});

it('rejects malformed UTF-8 without silently replacing bytes or creating an empty file', async () => {
  mounted = await h.mount();
  const bytes = new Uint8Array([0xff]);
  const file = new File([bytes], 'invalid.sql');
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  await act(async () => {
    fireEvent.change(mounted!.container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
  });
  expect(screen.getByRole('alert').textContent).toContain('UTF-8');
  expect(screen.getByRole('button', { name: 'Create file' })).toHaveProperty('disabled', true);
  await act(async () => {
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);
  });
  expect(h.save).not.toHaveBeenCalled();
});

it('retires a batched A-to-B-to-A lifetime and permits a fresh explicit creation', async () => {
  mounted = await h.mount();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'New file' }));
  });
  act(() => {
    fireEvent.change(screen.getByLabelText('File path'), { target: { value: 'models/new.sql' } });
  });
  let finish!: (receipt: typeof h.receipt) => void;
  h.save.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
  });
  act(() => {
    h.changeScope();
    h.changeScope(h.initialScope);
  });
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(async () => {
    finish(h.receipt);
  });
  expect(h.open).not.toHaveBeenCalled();
  expect(h.list).not.toHaveBeenCalled();
  h.save.mockResolvedValue({ ...h.receipt, path: 'demo/after.sql' });
  h.list.mockResolvedValue([{ path: 'demo/after.sql', name: 'after.sql', kind: 'file' }]);
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'New file' }));
  });
  act(() => {
    fireEvent.change(screen.getByLabelText('File path'), { target: { value: 'after.sql' } });
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
  });
  expect(h.save).toHaveBeenCalledTimes(2);
  expect(h.open).toHaveBeenCalledExactlyOnceWith('demo/after.sql');
});

it('discards an accepted reply when the displayed root changes', async () => {
  mounted = await h.mount();
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'New file' }));
  });
  act(() => {
    fireEvent.change(screen.getByLabelText('File path'), { target: { value: 'new.sql' } });
  });
  let finish!: (receipt: typeof h.receipt) => void;
  h.save.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Create file' }));
  });
  await mounted.render(h.view('other'));
  await act(async () => {
    finish(h.receipt);
  });
  expect(h.list).not.toHaveBeenCalled();
  expect(h.open).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('rejects an oversized import before allocating its byte buffer', async () => {
  mounted = await h.mount();
  const file = new File([new Uint8Array(1_000_001)], 'large.sql');
  const read = vi.fn(async () => new ArrayBuffer(0));
  Object.defineProperty(file, 'arrayBuffer', { value: read });
  await act(async () => {
    fireEvent.change(mounted!.container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
  });
  expect(read).not.toHaveBeenCalled();
  expect(h.save).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create file' })).toHaveProperty('disabled', true);
});
