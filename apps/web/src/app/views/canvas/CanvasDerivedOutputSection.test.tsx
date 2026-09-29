// @vitest-environment jsdom
import React, { act } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasDerivedOutputSection } from './CanvasDerivedOutputSection';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import { CANVAS_RELATIONAL_FIELD_DRAG_TYPE } from './canvasRelationalTreeDrag';
import { DerivedOutputFormulaForm } from './DerivedOutputFormulaForm';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

vi.mock('../../components/monaco/MonacoCodeEditor', async () => ({
  MonacoCodeEditor: (await import('./formulaMonaco.test-support')).FormulaMonacoTestSurface,
}));
vi.mock('./canvasFormulaMonaco', () => ({ configureFormulaEditor: () => () => undefined }));

describe('selected relation derived-output section', () => {
  setupWorkbenchTest();

  it('inserts an operand by click, wraps the selection and shows compiler feedback before any command', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    await act(async () =>
      root.render(
        <DerivedOutputFormulaForm
          fields={[{ fieldId: 'name', name: 'customer', dataType: 'string' }]}
          provider="postgres"
          dragScope={{
            rootId: 'root',
            revision: 1,
            references: [{ fieldId: 'name', relationId: 'read', name: 'customer' }],
          }}
          copy={resolveCanvasSemanticEditorCopy('en').derivedOutput}
          unavailableAliases={[]}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />
      )
    );
    const formula = container.querySelector<HTMLTextAreaElement>('textarea')!;
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="formula-operand"]')!)
    );
    expect(formula.value).toBe('"customer"');
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
      true
    );
    formula.setSelectionRange(0, formula.value.length);
    await act(async () =>
      fireEvent.click(container.querySelectorAll('.formula-palette-tabs button')[1]!)
    );
    const upper = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-slot="formula-operand"]'),
    ].find((button) => button.title === 'UPPER(arg1)')!;
    await act(async () => fireEvent.click(upper));
    expect(formula.value).toBe('UPPER("customer")');
    expect(container.querySelector('.formula-result')?.textContent).toContain('string');
    expect(container.querySelector('.formula-result')?.textContent).toContain('customer');
    expect(onSubmit).not.toHaveBeenCalled();
    await act(async () =>
      fireEvent.change(container.querySelector('input[name="alias"]')!, {
        target: { value: 'normalized' },
      })
    );
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(onSubmit).toHaveBeenCalledWith({ alias: 'normalized', formula: 'UPPER("customer")' });
  });

  it('stays read-only until requested and commits one revision-bound document', async () => {
    const document = connectedNamesProjectionDraft();
    const lookup = new CanvasRelationAnalysisSession('derived-output-test-identity');
    lookup.receive(document);
    const relationId = lookup.rootId;
    const onChange = vi.fn();
    const onPendingChange = vi.fn();

    function Host({ snapshot = document }: { snapshot?: typeof document }): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(snapshot, 'derived-output-section');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasDerivedOutputSection
            relationId={relationId}
            onChange={onChange}
            onPendingChange={onPendingChange}
          />
        </CanvasRelationAnalysisContext.Provider>
      );
    }

    await act(async () => root.render(<Host />));
    await waitFor(() =>
      expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).not.toBeNull()
    );
    expect(container.querySelector('[data-slot="canvas-derived-output-form"]')).toBeNull();

    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-trigger"]')!)
    );
    expect(container.querySelector('[data-slot="canvas-derived-output-form"]')).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onPendingChange).toHaveBeenLastCalledWith(true);

    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-cancel"]')!)
    );
    expect(container.querySelector('[data-slot="canvas-derived-output-form"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onPendingChange).toHaveBeenLastCalledWith(false);

    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-trigger"]')!)
    );
    const formula = container.querySelector<HTMLTextAreaElement>('textarea[name="formula"]')!;
    expect(formula).not.toBeNull();
    expect(formula.value).toBe('');
    expect(
      container.querySelectorAll('[data-slot="formula-operand"][data-kind="field"]').length
    ).toBeGreaterThan(0);
    await act(async () => fireEvent.change(formula, { target: { value: 'UPPER(first_name)' } }));
    await act(async () =>
      fireEvent.change(container.querySelector<HTMLInputElement>('input[name="alias"]')!, {
        target: { value: 'normalized_name' },
      })
    );
    await act(async () => root.render(<Host snapshot={structuredClone(document)} />));
    expect(container.querySelector<HTMLInputElement>('input[name="alias"]')?.value).toBe(
      'normalized_name'
    );
    await act(async () => fireEvent.submit(container.querySelector('form')!));

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    const indexed = indexSubstraitRelations(onChange.mock.calls[0]![0]);
    if (!indexed.ok) throw indexed.error;
    const project = indexed.index.relations.get(relationId);
    expect(project?.relation.relType.case).toBe('project');
    expect(
      onChange.mock.calls[0]![0].sidecar.fields.some(
        (field: { displayName?: string }) => field.displayName === 'normalized_name'
      )
    ).toBe(true);
  });

  it('does not offer the edited output as its own formula operand', async () => {
    const session = new CanvasRelationAnalysisSession('derived-output-self-reference-identity');
    session.receive(connectedNamesProjectionDraft());
    const relationId = session.rootId;
    const document = await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      formula: 'UPPER(first_name)',
    });
    const output = document.sidecar.fields.find(
      (field) => field.parentFieldId == null && field.displayName === 'normalized_name'
    );
    if (output == null) throw new Error('Expected derived output.');
    const onChange = vi.fn();

    function Host(): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(document, 'derived-output-self-reference');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasDerivedOutputSection relationId={relationId} onChange={onChange} />
        </CanvasRelationAnalysisContext.Provider>
      );
    }

    await act(async () => root.render(<Host />));
    await waitFor(() =>
      expect(
        container.querySelector(
          `[data-slot="canvas-derived-output"][data-field-id="${output.fieldId}"]`
        )
      ).not.toBeNull()
    );
    await act(async () =>
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          `[data-slot="canvas-derived-output"][data-field-id="${output.fieldId}"] button`
        )!
      )
    );

    const formula = container.querySelector<HTMLTextAreaElement>('textarea[name="formula"]')!;
    expect(formula.value).toBe('UPPER(first_name)');
    await act(async () =>
      fireEvent.change(formula, { target: { value: 'UPPER(normalized_name)' } })
    );
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('keeps a typed draft but refuses to rebind it silently after a semantic revision', async () => {
    const document = connectedNamesProjectionDraft();
    const lookup = new CanvasRelationAnalysisSession('stale-formula-test');
    lookup.receive(document);
    const relationId = lookup.rootId;
    const updated = await applySelectedRelationDerivedOutput(lookup, {
      intent: 'edit',
      relationId,
      expectedRevision: lookup.revision,
      alias: 'other_output',
      formula: "'concurrent change'",
    });
    const onChange = vi.fn();
    function Host({ snapshot }: { snapshot: typeof document }): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(snapshot, 'stale-formula-form');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasDerivedOutputSection relationId={relationId} onChange={onChange} />
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host snapshot={document} />));
    await waitFor(() =>
      expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).not.toBeNull()
    );
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-trigger"]')!)
    );
    await act(async () => {
      fireEvent.change(container.querySelector('input[name="alias"]')!, {
        target: { value: 'mine' },
      });
      fireEvent.change(container.querySelector('textarea[name="formula"]')!, {
        target: { value: 'UPPER(first_name)' },
      });
    });
    await act(async () => root.render(<Host snapshot={updated} />));
    expect(container.querySelector<HTMLTextAreaElement>('textarea[name="formula"]')!.value).toBe(
      'UPPER(first_name)'
    );
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    lookup.dispose();
  });

  it('inserts a scoped field drag at the caret without publishing, navigating or accepting foreign/stale payloads', async () => {
    const document = connectedNamesProjectionDraft();
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const relationId = indexed.index.rootId;
    const field = indexed.index.relations.get(indexed.index.relations.get(relationId)!.inputs[0]!)!
      .fields[0]!;
    const onChange = vi.fn();
    const outsideDrop = vi.fn();
    function Host(): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(document, 'operand-drag-test');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <div onDrop={outsideDrop}>
            <CanvasRelationalScalarTree
              compact
              graph={{
                relationId,
                relationCount: 0,
                expressionCount: 0,
                edges: [],
                nodes: [
                  {
                    id: 'operand',
                    position: { x: 0, y: 0 },
                    data: {
                      label: `FIELD\n${field.displayName}`,
                      detail: field.displayName!,
                      semanticKind: 'field',
                      semanticGroup: 'transformation',
                      fieldReference: { relationId: field.relationId, fieldId: field.fieldId },
                    },
                  },
                ],
              }}
            />
            <CanvasDerivedOutputSection relationId={relationId} onChange={onChange} />
          </div>
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host />));
    await waitFor(() =>
      expect(container.querySelector('[data-slot="canvas-derived-output-trigger"]')).not.toBeNull()
    );
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-trigger"]')!)
    );
    const formula = container.querySelector<HTMLTextAreaElement>('textarea[name="formula"]')!;
    await act(async () => fireEvent.change(formula, { target: { value: 'UPPER()' } }));
    formula.setSelectionRange(6, 6);
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (type: string, value: string) => data.set(type, value),
      getData: (type: string) => data.get(type) ?? '',
      types: [CANVAS_RELATIONAL_FIELD_DRAG_TYPE],
    };
    await act(async () =>
      fireEvent.dragStart(container.querySelector('[data-semantic-node-id="operand"]')!, {
        dataTransfer,
      })
    );
    const payload = JSON.parse(data.get(CANVAS_RELATIONAL_FIELD_DRAG_TYPE)!);
    for (const invalid of [
      '{',
      'null',
      JSON.stringify({ ...payload, rootId: 'foreign' }),
      JSON.stringify({ ...payload, revision: payload.revision + 1 }),
      JSON.stringify({ ...payload, fieldId: 'unavailable' }),
      JSON.stringify({ ...payload, relationId: 'foreign' }),
    ]) {
      data.set(CANVAS_RELATIONAL_FIELD_DRAG_TYPE, invalid);
      await act(async () => fireEvent.drop(formula, { dataTransfer }));
      expect(formula.value).toBe('UPPER()');
      expect(onChange).not.toHaveBeenCalled();
    }
    data.set(CANVAS_RELATIONAL_FIELD_DRAG_TYPE, JSON.stringify(payload));
    await act(async () => fireEvent.drop(formula, { dataTransfer }));
    expect(formula.value).toBe(`UPPER("${field.displayName}")`);
    expect(outsideDrop).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => fireEvent.keyDown(formula, { key: 'Escape' }));
    expect(container.querySelector('form')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
