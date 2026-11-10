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
}: {
  canEdit: boolean;
  onApply: (draft: CanvasInspectorNodeDraft) => void;
}): JSX.Element {
  const draftController = useCanvasNodeWorkbenchDraftController(node);
  return (
    <CanvasModelIdentityField
      node={node}
      nodes={[node]}
      edges={[]}
      authoring={{ canEditNode: canEdit, onApplyNodeDraft: onApply }}
      draftController={draftController}
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

  it('shows identity without a mutation control when editing is not permitted', () => {
    const onApply = vi.fn();
    act(() => root.render(<Harness canEdit={false} onApply={onApply} />));
    expect(container.textContent).toContain('Substrait');
    expect(queryByRole(container, 'combobox')).toBeNull();
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
