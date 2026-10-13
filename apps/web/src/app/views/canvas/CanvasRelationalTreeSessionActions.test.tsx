// @vitest-environment jsdom
/** Owned concern: verify passive session-action forwarding and actual portal/dialog adapters. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { CanvasRelationalTreeSessionActions } from './CanvasRelationalTreeSessionActions';
import {
  buildCanvasRelationalTreeSessionActionsModel,
  type CanvasRelationalTreeSessionActionsModel,
  type CanvasRelationalTreeSessionActionsBinding,
} from './canvasRelationalTreeSessionActionsModel';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import {
  useApplicationLanguageStore,
  type ApplicationLanguage,
} from '../../stores/applicationLanguageStore';

describe('Passive relational session actions', () => {
  let container: HTMLDivElement;
  let root: Root;
  let language: ApplicationLanguage;
  let actEnvironment: boolean | undefined;
  const buildModel = (
    canApply = true,
    pendingNavigation = false
  ): CanvasRelationalTreeSessionActionsModel =>
    buildCanvasRelationalTreeSessionActionsModel(
      {
        active: true,
        canApply,
        hasUnappliedChanges: true,
        applyRejection: null,
        pendingNavigation,
      },
      resolveCanvasViewCopy('en'),
      'en'
    );
  const createBinding = (): Record<
    keyof CanvasRelationalTreeSessionActionsBinding,
    Mock<() => void>
  > => ({
    onApply: vi.fn(),
    onCancel: vi.fn(),
    onStay: vi.fn(),
    onDiscard: vi.fn(),
    onApplyAndNavigate: vi.fn(),
  });
  beforeEach(() => {
    actEnvironment = (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    language = useApplicationLanguageStore.getState().language;
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useApplicationLanguageStore.getState().configureApplicationLanguage(language);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = actEnvironment;
  });

  it('does not render or dispatch when hidden', () => {
    const binding = createBinding();
    act(() =>
      root.render(
        <CanvasRelationalTreeSessionActions model={{ kind: 'hidden' }} binding={binding} />
      )
    );
    expect(container.childElementCount).toBe(0);
    for (const callback of Object.values(binding)) expect(callback).not.toHaveBeenCalled();
  });

  it('forwards toolbar Apply and Cancel only to their own callbacks', () => {
    const binding = createBinding();
    const copy = resolveCanvasViewCopy('en');
    act(() =>
      root.render(<CanvasRelationalTreeSessionActions model={buildModel()} binding={binding} />)
    );
    for (const callback of Object.values(binding)) expect(callback).not.toHaveBeenCalled();
    const apply = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-apply"]'
    )!;
    const cancel = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-cancel"]'
    )!;
    expect(apply.getAttribute('aria-label')).toBe(copy.inspectorDvtRelationalApply);
    expect(apply.title).toBe(copy.inspectorDvtRelationalApply);
    expect(cancel.getAttribute('aria-label')).toBe(copy.inspectorDvtRelationalCancel);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      resolveCanvasSemanticEditorCopy('en').draft
    );
    act(() => {
      apply.click();
      cancel.click();
    });
    expect(binding.onApply).toHaveBeenCalledOnce();
    expect(binding.onCancel).toHaveBeenCalledOnce();
    expect(binding.onApplyAndNavigate).not.toHaveBeenCalled();
    expect(binding.onStay).not.toHaveBeenCalled();
    expect(binding.onDiscard).not.toHaveBeenCalled();
  });

  it('keeps blocked Apply disabled without disabling Cancel', () => {
    const binding = createBinding();
    act(() =>
      root.render(
        <CanvasRelationalTreeSessionActions model={buildModel(false)} binding={binding} />
      )
    );
    const apply = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-apply"]'
    )!;
    const cancel = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-cancel"]'
    )!;
    expect(apply.disabled).toBe(true);
    expect(cancel.disabled).toBe(false);
    act(() => {
      apply.click();
      cancel.click();
    });
    expect(binding.onApply).not.toHaveBeenCalled();
    expect(binding.onCancel).toHaveBeenCalledOnce();
  });

  it('places controls in the actual external host and restores the null-host fallback', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const binding = createBinding();
    try {
      act(() =>
        root.render(
          <CanvasRelationalTreeSessionActions model={buildModel()} binding={binding} host={host} />
        )
      );
      expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).toBeNull();
      const apply = host.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-relational-tree-apply"]'
      )!;
      act(() => apply.click());
      expect(binding.onApply).toHaveBeenCalledOnce();
      act(() =>
        root.render(
          <CanvasRelationalTreeSessionActions model={buildModel()} binding={binding} host={null} />
        )
      );
      expect(host.childElementCount).toBe(0);
      expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).not.toBeNull();
      expect(binding.onCancel).not.toHaveBeenCalled();
    } finally {
      host.remove();
    }
  });

  it.each(['onStay', 'onDiscard', 'onApplyAndNavigate'] as const)(
    'forwards decision %s without substituting toolbar commands',
    (action) => {
      const binding = createBinding();
      const model = buildModel(true, true);
      if (model.kind !== 'active') throw new Error('Expected active presentation');
      act(() =>
        root.render(
          <CanvasRelationalTreeSessionActions
            model={{ ...model, rejectionMessage: 'Rejected transaction' }}
            binding={binding}
          />
        )
      );
      const dialog = document.querySelector('[role="alertdialog"]')!;
      expect(dialog.querySelector('[role="alert"]')?.textContent).toBe('Rejected transaction');
      expect(container.querySelector('[role="alert"]')?.textContent).toBe('Rejected transaction');
      for (const callback of Object.values(binding)) expect(callback).not.toHaveBeenCalled();
      const button =
        action === 'onStay'
          ? [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
              (element) => element.textContent === resolveCanvasSemanticEditorCopy('en').stay
            )!
          : dialog.querySelector<HTMLButtonElement>(
              `[data-slot="${action === 'onDiscard' ? 'canvas-draft-discard' : 'canvas-draft-apply'}"]`
            )!;
      act(() => button.click());
      expect(binding[action]).toHaveBeenCalledOnce();
      for (const [name, callback] of Object.entries(binding))
        if (name !== action) expect(callback).not.toHaveBeenCalled();
    }
  );

  it('preserves blocked dialog Apply and rendering without command dispatch', () => {
    const binding = createBinding();
    act(() =>
      root.render(
        <CanvasRelationalTreeSessionActions model={buildModel(false, true)} binding={binding} />
      )
    );
    const apply = document.querySelector<HTMLButtonElement>('[data-slot="canvas-draft-apply"]')!;
    expect(apply.disabled).toBe(true);
    act(() => apply.click());
    for (const callback of Object.values(binding)) expect(callback).not.toHaveBeenCalled();
  });
});
