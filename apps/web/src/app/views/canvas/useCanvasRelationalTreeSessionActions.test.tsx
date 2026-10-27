// @vitest-environment jsdom
/** Owned concern: verify current locale and callback binding without executing the edit transaction. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasRelationalTreeSessionActions } from './useCanvasRelationalTreeSessionActions';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
import type {
  CanvasRelationalTreeSessionActionsModel,
  CanvasRelationalTreeSessionActionsBinding,
} from './canvasRelationalTreeSessionActionsModel';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { formatCanvasModelOutputDependencyRejection } from './canvasCopyFormatting';
import {
  useApplicationLanguageStore,
  type ApplicationLanguage,
} from '../../stores/applicationLanguageStore';

describe('Relational session-action controller', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousLanguage: ApplicationLanguage;
  let actEnvironment: boolean | undefined;
  beforeEach(() => {
    actEnvironment = (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    previousLanguage = useApplicationLanguageStore.getState().language;
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useApplicationLanguageStore.getState().configureApplicationLanguage(previousLanguage);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = actEnvironment;
  });

  it('reacts to locale changes while keeping exact typed rejection context and no dispatch', () => {
    const rejection = {
      outcome: 'rejected',
      reason: 'model_output_required',
      consumer: { nodeId: 'model2', name: 'Model 2' },
      fields: [{ fieldId: 'stable-amount', name: 'amount' }],
    } as const;
    const session: CanvasRelationalTreeWorkbenchHandle = {
      hasUnappliedChanges: true,
      canApply: true,
      applyRejection: rejection,
      apply: vi.fn(() => ({ outcome: 'no_changes' as const })),
      cancel: vi.fn(),
    };
    const navigation = { pending: true, apply: vi.fn(), stay: vi.fn(), discard: vi.fn() };
    let current: Readonly<{
      model: CanvasRelationalTreeSessionActionsModel;
      binding: CanvasRelationalTreeSessionActionsBinding;
    }>;
    function Host(): null {
      current = useCanvasRelationalTreeSessionActions({
        active: true,
        session,
        navigation,
        copy: {
          inspectorDvtRelationalApply: 'Explicit Apply',
          inspectorDvtRelationalCancel: 'Explicit Cancel',
        },
      });
      return null;
    }
    act(() => root.render(<Host />));
    expect(Object.keys(current!).sort()).toEqual(['binding', 'model']);
    expect(current!.model).toMatchObject({
      kind: 'active',
      applyLabel: 'Explicit Apply',
      cancelLabel: 'Explicit Cancel',
      draftLabel: resolveCanvasSemanticEditorCopy('en').draft,
      rejectionMessage: formatCanvasModelOutputDependencyRejection(rejection, 'en'),
    });
    act(() => useApplicationLanguageStore.getState().configureApplicationLanguage('es'));
    expect(current!.model).toMatchObject({
      draftLabel: resolveCanvasSemanticEditorCopy('es').draft,
      rejectionMessage: formatCanvasModelOutputDependencyRejection(rejection, 'es'),
    });
    expect(session.apply).not.toHaveBeenCalled();
    expect(session.cancel).not.toHaveBeenCalled();
    for (const callback of [navigation.apply, navigation.stay, navigation.discard])
      expect(callback).not.toHaveBeenCalled();
  });

  it('forwards replacement callbacks exactly and keeps an inactive session inert', () => {
    let session: CanvasRelationalTreeWorkbenchHandle = {
      hasUnappliedChanges: true,
      canApply: true,
      applyRejection: null,
      apply: vi.fn(() => ({ outcome: 'no_changes' as const })),
      cancel: vi.fn(),
    };
    let navigation = { pending: true, apply: vi.fn(), stay: vi.fn(), discard: vi.fn() };
    const originalSession = session;
    const originalNavigation = navigation;
    let active = false;
    let current: Readonly<{
      model: CanvasRelationalTreeSessionActionsModel;
      binding: CanvasRelationalTreeSessionActionsBinding;
    }>;
    function Host(): null {
      current = useCanvasRelationalTreeSessionActions({
        active,
        session,
        navigation,
        copy: { inspectorDvtRelationalApply: 'Apply', inspectorDvtRelationalCancel: 'Cancel' },
      });
      return null;
    }
    act(() => root.render(<Host />));
    expect(current!.model).toEqual({ kind: 'hidden' });
    expect(current!.binding.onApply).toBe(session.apply);
    expect(current!.binding.onApplyAndNavigate).toBe(navigation.apply);
    expect(session.apply).not.toHaveBeenCalled();
    expect(session.cancel).not.toHaveBeenCalled();
    for (const callback of [navigation.apply, navigation.stay, navigation.discard])
      expect(callback).not.toHaveBeenCalled();
    session = {
      ...session,
      apply: vi.fn(() => ({ outcome: 'no_changes' as const })),
      cancel: vi.fn(),
    };
    navigation = { pending: false, apply: vi.fn(), stay: vi.fn(), discard: vi.fn() };
    active = true;
    act(() => root.render(<Host />));
    expect(current!.binding.onApply).toBe(session.apply);
    expect(current!.binding.onCancel).toBe(session.cancel);
    expect(current!.binding.onStay).toBe(navigation.stay);
    expect(current!.binding.onDiscard).toBe(navigation.discard);
    expect(current!.binding.onApplyAndNavigate).toBe(navigation.apply);
    expect(current!.model).toMatchObject({ kind: 'active', decision: { open: false } });
    expect(session.apply).not.toHaveBeenCalled();
    expect(session.cancel).not.toHaveBeenCalled();
    for (const callback of [navigation.apply, navigation.stay, navigation.discard])
      expect(callback).not.toHaveBeenCalled();
    act(() => {
      for (const callback of Object.values(current!.binding)) void callback();
    });
    expect(session.apply).toHaveBeenCalledOnce();
    expect(session.cancel).toHaveBeenCalledOnce();
    for (const callback of [navigation.apply, navigation.stay, navigation.discard])
      expect(callback).toHaveBeenCalledOnce();
    expect(originalSession.apply).not.toHaveBeenCalled();
    expect(originalSession.cancel).not.toHaveBeenCalled();
    for (const callback of [
      originalNavigation.apply,
      originalNavigation.stay,
      originalNavigation.discard,
    ])
      expect(callback).not.toHaveBeenCalled();
  });
});
