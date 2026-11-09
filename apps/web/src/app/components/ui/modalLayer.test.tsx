// @vitest-environment jsdom
/** Shared modal composition must remain reachable through repeated and nested lifetimes. */
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from './alert-dialog';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});
const render = (element: ReactElement): void => {
  act(() => {
    root.render(element);
  });
};
const click = (element: HTMLElement): void => {
  act(() => {
    fireEvent.click(element);
  });
};

it('keeps an alert inside its own backdrop through repeated open and cancel', async () => {
  // Equal-level sibling portals let a reinserted backdrop cover enabled Model decision buttons.
  render(
    <AlertDialog>
      <AlertDialogTrigger>Open decision</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Decision</AlertDialogTitle>
        <AlertDialogDescription>Keep the draft safe.</AlertDialogDescription>
        <AlertDialogCancel>Stay</AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>
  );
  const opener = screen.getByRole('button', { name: 'Open decision' });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    click(opener);
    const content = screen.getByRole('alertdialog');
    const backdrop = document.querySelector('[data-slot="alert-dialog-overlay"]');
    expect(backdrop?.contains(content), 'one modal stacking unit').toBe(true);
    click(screen.getByRole('button', { name: 'Stay' }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(opener);
    });
  }
});

it.each([true, false])('preserves Dialog content and actions with modal=%s', (modal) => {
  // A shared backdrop fix must not hide non-modal content or transfer its state to another owner.
  const action = vi.fn();
  render(
    <Dialog modal={modal} defaultOpen>
      <DialogContent>
        <DialogTitle>Details</DialogTitle>
        <DialogDescription>Existing widget content.</DialogDescription>
        <button onClick={action}>Inspect</button>
      </DialogContent>
    </Dialog>
  );
  const content = screen.getByRole('dialog');
  const backdrop = document.querySelector('[data-slot="dialog-overlay"]');
  if (modal) expect(backdrop?.contains(content)).toBe(true);
  else expect(backdrop).toBeNull();
  click(screen.getByRole('button', { name: 'Inspect' }));
  expect(action).toHaveBeenCalledOnce();
});

it('keeps nested modal pairs separate and restores each actual trigger', async () => {
  // The inner backdrop must cover the outer pair as a unit, rather than sit beneath all contents.
  render(
    <Dialog>
      <DialogTrigger>Open outer</DialogTrigger>
      <DialogContent>
        <DialogTitle>Outer</DialogTitle>
        <DialogDescription>Outer scope.</DialogDescription>
        <DialogClose>Close outer</DialogClose>
        <AlertDialog>
          <AlertDialogTrigger>Open inner</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Inner</AlertDialogTitle>
            <AlertDialogDescription>Inner scope.</AlertDialogDescription>
            <AlertDialogCancel>Close inner</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
  const outerTrigger = screen.getByRole('button', { name: 'Open outer' });
  click(outerTrigger);
  const outer = screen.getByRole('dialog');
  const innerTrigger = screen.getByRole('button', { name: 'Open inner' });
  click(innerTrigger);
  const inner = screen.getByRole('alertdialog');
  expect(document.querySelector('[data-slot="dialog-overlay"]')?.contains(outer)).toBe(true);
  expect(document.querySelector('[data-slot="alert-dialog-overlay"]')?.contains(inner)).toBe(true);
  expect(outer.contains(inner)).toBe(false);
  click(screen.getByRole('button', { name: 'Close inner' }));
  await waitFor(() => {
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
  await waitFor(() => {
    expect(document.activeElement).toBe(innerTrigger);
  });
  click(screen.getByRole('button', { name: 'Close outer' }));
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  await waitFor(() => {
    expect(document.activeElement).toBe(outerTrigger);
  });
});
