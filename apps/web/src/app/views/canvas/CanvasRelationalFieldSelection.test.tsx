// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createPortal } from 'react-dom';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import {
  CanvasRelationalFieldSelectionProvider,
  useCanvasRelationalFieldSelection,
} from './CanvasRelationalFieldSelectionProvider';
import { CanvasRelationalFieldToken } from './CanvasRelationalFieldToken';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { COPY } from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';

function FieldSelectionSurface({
  document,
}: Readonly<{ document: SubstraitDocument }>): React.JSX.Element {
  const actions = useCanvasRelationalFieldSelection();
  const index = indexSubstraitRelations(document);
  if (!index.ok) throw new Error('Invalid fixture');
  const relation = index.index.relations.get(index.index.rootId)!;
  const input = index.index.relations.get(relation.inputs[0]!)!;
  return (
    <div
      data-testid="background"
      onDragOver={actions?.backgroundDragOver}
      onDrop={actions?.backgroundDrop}
    >
      <div data-slot="canvas-relational-card">
        <button type="button">Invalid card target</button>
        {[input, relation].map((owner) =>
          owner.fields.map((field) => (
            <CanvasRelationalFieldToken
              key={field.fieldId}
              id={field.fieldId}
              relationId={relation.binding.relationId}
              title={field.displayName!}
              data={{
                label: field.displayName!,
                detail: field.displayName!,
                semanticKind: 'field',
                semanticGroup: 'transformation',
                fieldReference: { relationId: owner.binding.relationId, fieldId: field.fieldId },
                fieldSelection: owner === relation ? 'output' : 'input',
              }}
            >
              {field.displayName}
            </CanvasRelationalFieldToken>
          ))
        )}
        <CanvasRelationalFieldToken
          id="output"
          relationId={relation.binding.relationId}
          title="Output"
          data={{
            label: 'OUTPUT',
            detail: 'Output',
            semanticKind: 'group',
            semanticGroup: 'transformation',
            fieldTargetRelationId: relation.binding.relationId,
          }}
        >
          Output
        </CanvasRelationalFieldToken>
      </div>
    </div>
  );
}

describe('relational tree selection gestures', () => {
  setupWorkbenchTest();
  const mount = async (enabled = true, portal?: HTMLElement): Promise<ReturnType<typeof vi.fn>> => {
    const initial = connectedNamesProjectionDraft();
    const writes = vi.fn();
    function Host(): React.JSX.Element {
      const [document, setDocument] = useState<SubstraitDocument>(initial);
      const analysis = useCanvasRelationAnalysisSession(document, 'selection-test');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasRelationalFieldSelectionProvider
            enabled={enabled}
            onChange={(next) => {
              writes(next);
              setDocument(next);
            }}
          >
            {portal == null ? (
              <FieldSelectionSurface document={document} />
            ) : (
              createPortal(<FieldSelectionSurface document={document} />, portal)
            )}
          </CanvasRelationalFieldSelectionProvider>
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => {
      root.render(<Host />);
    });
    return writes;
  };
  const outputs = (): NodeListOf<HTMLElement> =>
    container.querySelectorAll<HTMLElement>('[data-field-selection="output"]');
  const transfer = (): Pick<
    DataTransfer,
    'effectAllowed' | 'dropEffect' | 'getData' | 'setData'
  > & { types: string[] } => {
    const values = new Map<string, string>();
    return {
      effectAllowed: 'copyMove',
      dropEffect: 'none',
      types: [] as string[],
      setData(type: string, value: string) {
        values.set(type, value);
        this.types.push(type);
      },
      getData(type: string) {
        return values.get(type) ?? '';
      },
    };
  };

  it('adds with Enter and removes with Delete through the same canonical selection', async () => {
    const writes = await mount();
    const retained = outputs()[0]!.dataset.fieldId;
    await act(async () => {
      fireEvent.keyDown(outputs()[1]!, { key: 'Delete' });
    });
    expect(outputs()).toHaveLength(1);
    expect(outputs()[0]!.dataset.fieldId).toBe(retained);
    await act(async () => {
      fireEvent.keyDown(container.querySelectorAll('[data-field-selection="input"]')[1]!, {
        key: 'Enter',
      });
    });
    expect(outputs()).toHaveLength(2);
    expect(writes).toHaveBeenCalledTimes(2);
  });

  it('only removes on explicit background drop and accepts a compatible Output drop first', async () => {
    const writes = await mount();
    const dataTransfer = transfer();
    await act(async () => {
      fireEvent.dragStart(outputs()[1]!, { dataTransfer });
      fireEvent.drop(container.querySelector('[data-testid="background"]')!, { dataTransfer });
    });
    expect(outputs()).toHaveLength(1);
    const input = container.querySelectorAll('[data-field-selection="input"]')[1]!;
    await act(async () => {
      fireEvent.dragStart(input, { dataTransfer });
      fireEvent.drop(container.querySelector('[data-field-target]')!, { dataTransfer });
      fireEvent.dragEnd(input, { dataTransfer });
    });
    expect(outputs()).toHaveLength(2);
    expect(writes).toHaveBeenCalledTimes(2);
  });

  it.each(['invalid-card', 'escape', 'lost-capture', 'end', 'input'])(
    'does not remove on %s',
    async (kind) => {
      const writes = await mount();
      const token =
        kind === 'input'
          ? container.querySelector('[data-field-selection="input"]')!
          : outputs()[1]!;
      const dataTransfer = transfer();
      await act(async () => {
        fireEvent.dragStart(token, { dataTransfer });
        if (kind === 'invalid-card')
          fireEvent.drop(container.querySelector('button')!, { dataTransfer });
        if (kind === 'input')
          fireEvent.drop(container.querySelector('[data-testid="background"]')!, { dataTransfer });
        if (kind === 'escape') fireEvent.keyDown(token, { key: 'Escape' });
        if (kind === 'lost-capture') fireEvent.lostPointerCapture(token);
        if (kind === 'escape' || kind === 'lost-capture')
          fireEvent.drop(container.querySelector('[data-testid="background"]')!, { dataTransfer });
        fireEvent.dragEnd(token, { dataTransfer });
      });
      expect(outputs()).toHaveLength(2);
      expect(writes).not.toHaveBeenCalled();
    }
  );

  it('readonly selection has no keyboard actions or background writes', async () => {
    const writes = await mount(false);
    const token = outputs()[1]!;
    expect(token.hasAttribute('tabindex')).toBe(false);
    const dataTransfer = transfer();
    await act(async () => {
      fireEvent.keyDown(token, { key: 'Delete' });
      fireEvent.dragStart(token, { dataTransfer });
      fireEvent.drop(container.querySelector('[data-testid="background"]')!, { dataTransfer });
    });
    expect(writes).not.toHaveBeenCalled();
  });

  it('receives a background drop in the production Workbench viewport', async () => {
    const graph = occurrenceGraph();
    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={[graph.source, graph.targetNode]}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: () => ({ outcome: 'no_changes' }) }}
        />
      );
    });
    const card = container.querySelector('[data-operator="join"]')!.closest('li')!;
    await act(async () => {
      fireEvent.click(card.querySelector('[data-slot="canvas-relational-node-expand"]')!);
    });
    const token = card.querySelector('[data-field-selection="output"]')!;
    expect(token).not.toBeNull();
    const count = card.querySelectorAll('[data-field-selection="output"]').length;
    const dataTransfer = transfer();
    await act(async () => {
      fireEvent.dragStart(token, { dataTransfer });
      fireEvent.dragOver(
        container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!,
        { dataTransfer }
      );
      expect(dataTransfer.dropEffect).toBe('move');
      fireEvent.drop(container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!, {
        dataTransfer,
      });
    });
    expect(
      container.querySelector('[data-slot="canvas-field-selection-error"]')?.textContent
    ).toBeUndefined();
    const updated = container.querySelector('[data-operator="join"]')!.closest('li')!;
    expect(updated.querySelectorAll('[data-field-selection="output"]')).toHaveLength(count - 1);
  });

  it('recognizes background in its own DOM realm rather than the host window', async () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const body = frame.contentDocument!.body;
    const writes = await mount(true, body);
    const token = body.querySelector('[data-field-selection="output"]')!;
    const dataTransfer = transfer();
    await act(async () => {
      fireEvent.dragStart(token, { dataTransfer });
      fireEvent.drop(body.querySelector('[data-testid="background"]')!, { dataTransfer });
    });
    expect(writes).toHaveBeenCalledTimes(1);
    await act(async () => {
      root.render(null);
    });
    frame.remove();
  });
});
