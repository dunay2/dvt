// @vitest-environment jsdom
/** Prove the owning workspace excludes concurrent visual commands and refreshes namespace facts. */
import React, { act, forwardRef, useImperativeHandle, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { fireEvent, getByRole, waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ModelSqlContextResponseSchema } from '@dvt/contracts';
import { AppServicesProvider } from '../../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import type { ICanvasModelSqlQueryPort } from '../../../ports/canvasModelSql';
import type { CanonicalNode } from '../../../types/canonical';
import { CanvasModelEditor } from '../CanvasModelEditor';
import type { CanvasRelationalTreeWorkbenchHandle } from '../useCanvasRelationalTreeWorkbenchHandle';
import type {
  CanvasRelationalTreeWorkbenchProps,
  CanvasRelationalTreeAuthoringContract,
} from '../canvasRelationalTreeWorkbench.types';
import { transformNode } from '../CanvasRelationalTreeWorkbench.test-support';
import { modelSqlContext, proposal } from './modelSqlProtocol.test-fixtures';

const visualEdit = vi.fn();
vi.mock('../CanvasRelationalTreeWorkbench', () => ({
  CanvasRelationalTreeWorkbench: forwardRef<
    CanvasRelationalTreeWorkbenchHandle,
    CanvasRelationalTreeWorkbenchProps
  >((props, ref) => {
    useImperativeHandle(ref, () => ({
      hasUnappliedChanges: false,
      canApply: false,
      applying: false,
      applyRejection: null,
      apply: () => ({ outcome: 'no_changes' }),
      cancel: vi.fn(),
    }));
    return (
      <button disabled={props.authoring?.canEditNode !== true} onClick={visualEdit}>
        Visual edit
      </button>
    );
  }),
}));
vi.mock('../../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    value,
    onChange,
    ariaLabel,
    readOnly,
  }: {
    value: string;
    onChange: (sql: string) => void;
    ariaLabel: string;
    readOnly: boolean;
  }) => (
    <textarea
      aria-label={ariaLabel}
      readOnly={readOnly}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  visualEdit.mockClear();
});

async function mount(): Promise<{
  onApplyNodeDraft: Mock<CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']>;
  query: { [K in keyof ICanvasModelSqlQueryPort]: Mock<ICanvasModelSqlQueryPort[K]> };
  update: (patch: Partial<CanonicalNode>) => void;
}> {
  useApplicationLanguageStore.setState({ language: 'en' });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const onApplyNodeDraft = vi.fn<CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']>(() => ({
    outcome: 'no_changes',
  }));
  const query = {
    context: vi.fn<ICanvasModelSqlQueryPort['context']>(async () => modelSqlContext),
    compile: vi.fn<ICanvasModelSqlQueryPort['compile']>(async (input) => proposal(input)),
    preview: vi.fn<ICanvasModelSqlQueryPort['preview']>(),
  };
  let update!: (patch: Partial<CanonicalNode>) => void;
  function Host(): React.JSX.Element {
    const [source, setSource] = useState<CanonicalNode>({
      ...transformNode(),
      id: 'orders',
      name: 'Orders',
    });
    update = (patch) => setSource((previous) => ({ ...previous, ...patch }));
    return (
      <AppServicesProvider overrides={{ canvasModelSqlQuery: query }}>
        <CanvasModelEditor
          canvasId="canvas"
          transformNode={transformNode()}
          nodes={[source]}
          edges={[]}
          authoring={{ canEditNode: true, onApplyNodeDraft }}
          draftStatus={{
            label: 'Synced',
            tone: 'neutral',
            persistence: 'durable',
            showReloadAction: false,
          }}
          onClose={vi.fn()}
          onSelect={vi.fn()}
          onShowCanvas={vi.fn()}
        />
      </AppServicesProvider>
    );
  }
  const router = createMemoryRouter([{ path: '/', element: <Host /> }]);
  await act(async () => root!.render(<RouterProvider router={router} />));
  await act(async () =>
    fireEvent.click(getByRole(container, 'button', { name: 'Open Model SQL' }))
  );
  await waitFor(() => expect(query.context).toHaveBeenCalledOnce());
  await act(async () =>
    fireEvent.input(getByRole(container, 'textbox'), {
      target: { value: 'SELECT orders_id FROM orders' },
    })
  );
  return { onApplyNodeDraft, query, update };
}

describe('SQL transaction in the Model workspace', () => {
  it.each(['accepted', 'cancelled'] as const)(
    'locks visual commands until the actual %s command settles',
    async (outcome) => {
      const h = await mount();
      let settle!: (
        value: Awaited<ReturnType<CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']>>
      ) => void;
      h.onApplyNodeDraft.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            settle = resolve;
          })
      );
      await act(async () =>
        fireEvent.click(getByRole(container, 'button', { name: 'Generate Model' }))
      );
      await waitFor(() => expect(h.onApplyNodeDraft).toHaveBeenCalledOnce());
      expect(getByRole(container, 'button', { name: 'Visual edit' })).toHaveProperty(
        'disabled',
        true
      );
      await act(async () =>
        fireEvent.click(getByRole(container, 'button', { name: 'Visual edit' }))
      );
      expect(visualEdit).not.toHaveBeenCalled();
      if (outcome === 'cancelled') {
        await act(async () =>
          fireEvent.click(getByRole(container, 'button', { name: 'Cancel request' }))
        );
        expect(h.onApplyNodeDraft.mock.calls[0]![2]?.signal?.aborted).toBe(true);
        expect(getByRole(container, 'button', { name: 'Visual edit' })).toHaveProperty(
          'disabled',
          true
        );
      }
      await act(async () =>
        settle(
          outcome === 'accepted'
            ? { outcome: 'no_changes' }
            : { outcome: 'rejected', reason: 'node_unavailable' }
        )
      );
      await waitFor(() =>
        expect(getByRole(container, 'button', { name: 'Visual edit' })).toHaveProperty(
          'disabled',
          false
        )
      );
    }
  );
  it.each<Partial<CanonicalNode>>([
    { name: 'Renamed input' },
    { definitionId: 'another-definition' },
    { sourceDefinitionId: 'another-source' },
    { kind: 'dvt:source', role: 'input', pluginId: 'dvt.warehouse-source' },
  ])('refreshes the namespace when an input identity fact changes: %j', async (patch) => {
    const h = await mount();
    h.query.context.mockResolvedValueOnce(
      ModelSqlContextResponseSchema.parse({ ...modelSqlContext, contextSha256: 'b'.repeat(64) })
    );
    await act(async () => h.update(patch));
    await waitFor(() => expect(h.query.context).toHaveBeenCalledTimes(2));
    expect(getByRole(container, 'textbox')).toHaveProperty('value', 'SELECT orders_id FROM orders');
  });
});
