// @vitest-environment jsdom
/**
 * Owned concern: prove formula feedback and explicit submission use canonical field authority.
 * @baseline ADR-0064: direct selections and natural passthroughs retain the same input meaning.
 * @decision Exercise both production projection forms through the existing editor and command.
 * @consequence UI validation cannot introduce duplicate names or bypass real ambiguity guards.
 * @version 1.0.0
 */
import React, { act } from 'react';
import { fireEvent, waitFor } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { CanvasDerivedOutputSection } from './CanvasDerivedOutputSection';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { projectionScenario } from './canvasProjectionScenario.test-support';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import * as derivedOutputCommands from './canvasSelectedRelationDerivedOutput';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';
import { CANVAS_RELATIONAL_FIELD_DRAG_TYPE } from './canvasRelationalTreeDrag';
import { DerivedOutputFormulaForm } from './DerivedOutputFormulaForm';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import {
  TRANSFORM_DEPENDENCY_REJECTION,
  TransformDependencyError,
} from './TransformDependencyError';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { CanvasTransformInspector } from './CanvasTransformInspector';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

vi.mock('../../components/monaco/MonacoCodeEditor', async () => ({
  MonacoCodeEditor: (await import('./formulaMonaco.test-support')).FormulaMonacoTestSurface,
}));
vi.mock('./canvasFormulaMonaco', () => ({ configureFormulaEditor: () => () => undefined }));

describe('selected relation derived-output section', () => {
  setupWorkbenchTest();

  it('labels input and calculated operands as separate palette groups', async () => {
    await act(async () =>
      root.render(
        <DerivedOutputFormulaForm
          fields={[
            { fieldId: 'name', name: 'name', dataType: 'string', origin: 'input' },
            { fieldId: 'normalized', name: 'normalized', dataType: 'string', origin: 'calculated' },
          ]}
          provider="postgres"
          dragScope={{ rootId: 'root', revision: 1, references: [] }}
          copy={resolveCanvasSemanticEditorCopy('en').derivedOutput}
          unavailableAliases={[]}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />
      )
    );
    const inputs = container.querySelector('[data-slot="formula-input-fields"]');
    const calculated = container.querySelector('[data-slot="formula-calculated-fields"]');
    expect(inputs?.textContent).toContain('Input fields');
    expect(inputs?.textContent).not.toContain('normalized');
    expect(calculated?.textContent).toContain('Calculated fields');
    expect(calculated?.textContent).toContain('normalized');
  });

  it.each(
    (['en', 'es'] as const).flatMap((language) => [
      {
        language,
        code: TRANSFORM_DEPENDENCY_REJECTION.cycle,
        reason: language === 'en' ? 'cycle' : 'ciclo',
      },
      {
        language,
        code: TRANSFORM_DEPENDENCY_REJECTION.typeConflict,
        reason: language === 'en' ? 'incompatible' : 'incompatibles',
      },
    ])
  )('preserves the formula and reports $code in $language', async ({ language, code, reason }) => {
    const document = connectedNamesProjectionDraft();
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const relationId = indexed.index.rootId;
    const onChange = vi.fn();
    function Host(): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(document, 'derived-rejection');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasDerivedOutputSection relationId={relationId} onChange={onChange} />
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    const reject = vi
      .spyOn(derivedOutputCommands, 'applySelectedRelationDerivedOutput')
      .mockRejectedValueOnce(new TransformDependencyError(code, ['A', 'B']));
    await act(async () => useApplicationLanguageStore.setState({ language }));
    try {
      await act(async () => root.render(<Host />));
      await waitFor(() =>
        expect(
          container.querySelector('[data-slot="canvas-derived-output-trigger"]')
        ).not.toBeNull()
      );
      await act(async () =>
        fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-trigger"]')!)
      );
      await act(async () => {
        fireEvent.change(container.querySelector('input[name="alias"]')!, {
          target: { value: 'A' },
        });
        fireEvent.change(container.querySelector('textarea[name="formula"]')!, {
          target: { value: 'UPPER(first_name)' },
        });
      });
      await act(async () => fireEvent.submit(container.querySelector('form')!));
      const error = container.querySelector('[role="alert"]')?.textContent;
      expect(error).toContain(reason);
      expect(error).toContain('A, B');
      expect(container.querySelector<HTMLTextAreaElement>('textarea[name="formula"]')?.value).toBe(
        'UPPER(first_name)'
      );
      expect(container.querySelector<HTMLInputElement>('input[name="alias"]')?.value).toBe('A');
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      reject.mockRestore();
      await act(async () => useApplicationLanguageStore.setState({ language: 'en' }));
    }
  });

  it.each(
    (['en', 'es'] as const).flatMap((language) => [
      {
        language,
        formula: 'UPPER(missing)',
        reason: language === 'en' ? 'unavailable' : 'no está disponible',
      },
      {
        language,
        formula: 'UPPER(name)',
        reason: language === 'en' ? 'more than one field' : 'varios campos',
      },
    ])
  )(
    'localizes compiler rejection $formula in $language without submitting',
    async ({ language, formula, reason }) => {
      const onSubmit = vi.fn();
      await act(async () =>
        root.render(
          <DerivedOutputFormulaForm
            initial={{ alias: 'new_name', formula }}
            fields={[
              { fieldId: 'input:name', name: 'name', dataType: 'string', origin: 'input' },
              {
                fieldId: 'calculated:name',
                name: 'name',
                dataType: 'string',
                origin: 'calculated',
              },
            ]}
            provider="postgres"
            dragScope={{ rootId: 'root', revision: 1, references: [] }}
            copy={resolveCanvasSemanticEditorCopy(language).derivedOutput}
            unavailableAliases={[]}
            onSubmit={onSubmit}
            onCancel={vi.fn()}
          />
        )
      );
      expect(container.querySelector('.formula-diagnostic')?.textContent).toContain(reason);
      expect(container.querySelector('.formula-diagnostic')?.textContent).toContain(
        formula === 'UPPER(missing)' ? 'missing' : 'name'
      );
      expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
        true
      );
      await act(async () => fireEvent.submit(container.querySelector('form')!));
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(reason);
      expect(container.querySelector<HTMLTextAreaElement>('textarea[name="formula"]')!.value).toBe(
        formula
      );
      expect(onSubmit).not.toHaveBeenCalled();
    }
  );

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
    expect(container.querySelector('.formula-save-reason')?.textContent).toContain(
      'Enter an output name'
    );
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

  it('submits a named NULL constant through the same explicit action', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    const onCancel = vi.fn();
    await act(async () =>
      root.render(
        <DerivedOutputFormulaForm
          fields={[]}
          provider="postgres"
          dragScope={{ rootId: 'root', revision: 1, references: [] }}
          copy={resolveCanvasSemanticEditorCopy('en').derivedOutput}
          unavailableAliases={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )
    );
    await act(async () =>
      fireEvent.change(container.querySelector('input[name="alias"]')!, {
        target: { value: 'CAMPO_PRUEBA' },
      })
    );
    const insertNull = [
      ...container.querySelectorAll<HTMLButtonElement>('.formula-tools button'),
    ].find((button) => button.textContent === 'NULL')!;
    await act(async () => fireEvent.click(insertNull));
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
      false
    );
    expect(container.querySelector('.formula-save-reason')?.textContent).toContain(
      'Save this field first'
    );
    expect(onSubmit).not.toHaveBeenCalled();
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ alias: 'CAMPO_PRUEBA', formula: 'NULL' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it.each(['natural', 'selection'] as const)(
    'stays read-only and commits one revision-bound %s projection',
    async (projection) => {
      const document =
        projection === 'natural'
          ? connectedNamesProjectionDraft()
          : projectionScenario({
              sourceNodeId: 'customers',
              targetNodeId: 'names',
              fields: ['first_name', 'last_name'],
            });
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
        expect(
          container.querySelector('[data-slot="canvas-derived-output-trigger"]')
        ).not.toBeNull()
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
      expect(container.querySelector('.formula-result')?.textContent).toContain('first_name');
      expect(
        [...container.querySelectorAll('[data-slot="formula-operand"][data-kind="field"]')].filter(
          (element) => element.textContent?.includes('first_name')
        )
      ).toHaveLength(1);
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
    }
  );

  it('does not offer the edited output as its own formula operand', async () => {
    const session = new CanvasRelationAnalysisSession('derived-output-self-reference-identity');
    session.receive(connectedNamesProjectionDraft());
    const relationId = session.rootId;
    const document = await derivedOutputCommands.applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId,
      expectedRevision: session.revision,
      alias: 'normalized_name',
      formula: 'UPPER(first_name)',
    });
    const output = document.sidecar.fields.find(
      (field) =>
        field.relationId === relationId &&
        field.parentFieldId == null &&
        field.displayName === 'normalized_name'
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
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-trigger"]')!)
    );
    expect(container.querySelector('[data-slot="formula-input-fields"]')?.textContent).toContain(
      'first_name'
    );
    expect(
      container.querySelector('[data-slot="formula-input-fields"]')?.textContent
    ).not.toContain('normalized_name');
    expect(
      container.querySelector('[data-slot="formula-calculated-fields"]')?.textContent
    ).toContain('normalized_name');
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-cancel"]')!)
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
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('unavailable');
  });

  it('reopens dependent formulas by alias and keeps hidden definitions available and editable', async () => {
    const session = new CanvasRelationAnalysisSession('hidden-definition-palette');
    session.receive(connectedNamesProjectionDraft());
    const relationId = session.rootId;
    await derivedOutputCommands.applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId,
      expectedRevision: session.revision,
      alias: 'clean_name',
      formula: 'TRIM(first_name)',
    });
    await derivedOutputCommands.applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId,
      expectedRevision: session.revision,
      alias: 'upper_name',
      formula: 'UPPER(clean_name)',
    });
    const document = await changeSelectedRelationOutputs(session, {
      relationId,
      expectedRevision: session.revision,
      outputs: [{ slot: 0 }, { slot: 1 }, { slot: 3 }],
    });
    const upper = document.sidecar.fields.find(
      (field) => field.relationId === relationId && field.displayName === 'upper_name'
    )!;
    expect(
      document.sidecar.fields.some(
        (field) => field.relationId === relationId && field.displayName === 'clean_name'
      )
    ).toBe(false);
    const writes = vi.fn();
    function Host(): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(document, 'hidden-definition-form');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasDerivedOutputSection relationId={relationId} onChange={writes} />
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host />));
    await waitFor(() =>
      expect(container.querySelectorAll('[data-slot="canvas-derived-output"]')).toHaveLength(2)
    );
    await act(async () =>
      fireEvent.click(container.querySelector(`[data-field-id="${upper.fieldId}"] button`)!)
    );
    expect(container.querySelector<HTMLTextAreaElement>('textarea[name="formula"]')!.value).toBe(
      'UPPER(clean_name)'
    );
    expect(
      container.querySelector('[data-slot="formula-calculated-fields"]')?.textContent
    ).toContain('clean_name');
    expect(
      container.querySelector('[data-slot="formula-calculated-fields"]')?.textContent
    ).not.toContain('upper_name');
    expect(
      container.querySelector('[data-slot="formula-input-fields"]')?.textContent
    ).not.toContain('clean_name');
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-cancel"]')!)
    );
    const hidden = [...container.querySelectorAll('[data-slot="canvas-derived-output"]')].find(
      (item) => item.textContent?.includes('clean_name')
    )!;
    await act(async () => fireEvent.click(hidden.querySelector('button')!));
    expect(container.querySelector<HTMLTextAreaElement>('textarea[name="formula"]')!.value).toBe(
      'TRIM(first_name)'
    );
    // Dependents remain visible so the command can report cycles; only self is excluded.
    expect(
      container.querySelector('[data-slot="formula-calculated-fields"]')?.textContent
    ).toContain('upper_name');
    await act(async () =>
      fireEvent.change(container.querySelector('textarea[name="formula"]')!, {
        target: { value: 'LOWER(first_name)' },
      })
    );
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    await waitFor(() => expect(writes).toHaveBeenCalledOnce());
    expect(
      writes.mock.calls[0]![0].sidecar.fields.some(
        (field: { relationId: string; displayName?: string }) =>
          field.relationId === relationId && field.displayName === 'clean_name'
      )
    ).toBe(false);
    session.dispose();
  });

  it('exposes the canonical expression tree for a grouped Transform in its inspector', async () => {
    const session = new CanvasRelationAnalysisSession('grouped-inspector');
    session.receive(connectedNamesProjectionDraft());
    const relationId = session.rootId;
    const document = await derivedOutputCommands.applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId,
      expectedRevision: session.revision,
      alias: 'clean_name',
      formula: 'TRIM(first_name)',
    });
    const node = applyDvtSubstraitSemanticDocument(
      occurrenceGraph().targetNode,
      encodeDvtSubstraitSemanticDocument(document)
    );
    function Host(): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(document, 'grouped-inspector-presentation');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasTransformInspector
            relationId={relationId}
            transformNode={node}
            draft={document}
            onChange={vi.fn()}
            onClose={vi.fn()}
          />
        </CanvasRelationAnalysisContext.Provider>
      );
    }
    await act(async () => root.render(<Host />));
    await waitFor(() =>
      expect(container.querySelector('[data-slot="canvas-operation-tree-tab"]')).not.toBeNull()
    );
    expect(container.querySelector('[data-value="tree"]')?.textContent).toContain('TRIM');
    session.dispose();
  });

  it('keeps a typed draft but refuses to rebind it silently after a semantic revision', async () => {
    const document = connectedNamesProjectionDraft();
    const lookup = new CanvasRelationAnalysisSession('stale-formula-test');
    lookup.receive(document);
    const relationId = lookup.rootId;
    const updated = await derivedOutputCommands.applySelectedRelationDerivedOutput(lookup, {
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
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Reopen the field');
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
