// @vitest-environment jsdom
/** Regression proof: identity editing respects permissions and the real draft controller. */
import { act, type JSX } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getByRole, queryByRole } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasModelIdentityField } from './CanvasModelIdentityField';
import { useCanvasNodeWorkbenchDraftController } from './useCanvasNodeWorkbenchDraftController';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

const node: CanonicalNode = {
  id: 'model',
  name: 'Orders',
  kind: 'dvt:transform',
  pluginId: 'dvt',
  role: 'transform',
  status: 'idle',
  tags: [],
};
function Harness({
  canEdit,
  onApply,
  presentation = 'field',
}: {
  canEdit: boolean;
  onApply: (draft: CanvasInspectorNodeDraft) => void;
  presentation?: 'field' | 'icon';
}): JSX.Element {
  const draftController = useCanvasNodeWorkbenchDraftController(node);
  return (
    <CanvasModelIdentityField
      node={node}
      nodes={[node]}
      edges={[]}
      authoring={{ canEditNode: canEdit, onApplyNodeDraft: onApply }}
      draftController={draftController}
      presentation={presentation}
    />
  );
}

describe('model identity field', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    useApplicationLanguageStore.setState({ language: 'en' });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each(['field', 'icon'] as const)(
    'keeps the %s passive when editing is not permitted',
    (presentation) => {
      const onApply = vi.fn();
      act(() =>
        root.render(<Harness canEdit={false} onApply={onApply} presentation={presentation} />)
      );
      expect(container.querySelector('[data-model-icon="substrait"]')).not.toBeNull();
      expect(queryByRole(container, 'combobox')).toBeNull();
      expect(onApply).not.toHaveBeenCalled();
    }
  );

  // A control inside a Canvas card must not also invoke the card's select/edit/drag commands.
  it('isolates icon gestures and blocks the browser context menu without changing the model', () => {
    const onApply = vi.fn();
    const parentGesture = vi.fn();
    act(() =>
      root.render(
        <div
          onClick={parentGesture}
          onDoubleClick={parentGesture}
          onPointerDown={parentGesture}
          onContextMenu={parentGesture}
        >
          <Harness canEdit onApply={onApply} presentation="icon" />
        </div>
      )
    );
    const trigger = getByRole(container, 'combobox', { name: 'Change icon: Orders' });
    // Native pointer capture and dragging are exercised by Cypress, not emulated by jsdom.
    for (const type of ['click', 'dblclick', 'contextmenu']) {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true });
      act(() => {
        trigger.dispatchEvent(event);
      });
      if (type === 'contextmenu') expect(event.defaultPrevented).toBe(true);
    }
    expect(parentGesture).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('removes the editor when permission is revoked without submitting a draft', () => {
    const onApply = vi.fn();
    act(() => root.render(<Harness canEdit onApply={onApply} />));
    expect(getByRole(container, 'combobox', { name: 'Icon' }).textContent).toContain('Automatic');
    act(() => root.render(<Harness canEdit={false} onApply={onApply} />));
    expect(queryByRole(container, 'combobox')).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
  });
});
