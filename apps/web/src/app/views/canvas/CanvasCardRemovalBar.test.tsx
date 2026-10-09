// @vitest-environment jsdom
/** Owned concern: inline confirmation remains keyboard-accessible without modal navigation. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { CanvasCardRemovalBar } from './CanvasCardRemovalBar';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { container, root, setupWorkbenchTest } from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas card removal toolbar', () => {
  setupWorkbenchTest();

  it.each(['en', 'es'] as const)(
    'presents inline actions in %s, restores focus on Escape',
    async (language) => {
      const copy = resolveCanvasSemanticEditorCopy(language).cardRemoval;
      const confirm = vi.fn();
      const cancel = vi.fn();
      function Host({ pending }: Readonly<{ pending: boolean }>) {
        return (
          <div data-slot="canvas-relational-tree-workbench" tabIndex={-1}>
            <button data-slot="canvas-relational-tree-node" data-relation-id="source">
              Source
            </button>
            {pending ? (
              <CanvasCardRemovalBar
                targetId="source"
                title={copy.title.replace('{name}', 'Source')}
                description={copy.dependents.replace('{cards}', 'UNION ALL')}
                cancelLabel={copy.cancel}
                confirmLabel={copy.confirm}
                onCancel={cancel}
                onConfirm={confirm}
              />
            ) : null}
          </div>
        );
      }
      await act(async () => root.render(<Host pending />));
      const bar = container.querySelector('[data-slot="canvas-card-removal-bar"]')!;
      expect(bar.textContent).toContain('UNION ALL');
      expect(bar.closest('[data-slot="canvas-relational-tree-workbench"]')).not.toBeNull();
      expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull();
      expect(document.activeElement?.textContent).toBe(copy.cancel);
      await act(async () => fireEvent.keyDown(document.activeElement!, { key: 'Escape' }));
      expect(cancel).toHaveBeenCalledOnce();
      expect(confirm).not.toHaveBeenCalled();
      await act(async () => root.render(<Host pending={false} />));
      expect(document.activeElement?.getAttribute('data-relation-id')).toBe('source');
    }
  );

  it('dispatches only the selected action', async () => {
    const cancel = vi.fn();
    const confirm = vi.fn();
    await act(async () =>
      root.render(
        <CanvasCardRemovalBar
          title="Delete Source?"
          cancelLabel="Cancel"
          confirmLabel="Delete"
          onCancel={cancel}
          onConfirm={confirm}
        />
      )
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-card-removal-confirm"]')!
        .click()
    );
    expect(confirm).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
  });
});
