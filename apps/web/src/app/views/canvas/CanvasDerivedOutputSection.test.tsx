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

describe('selected relation derived-output section', () => {
  setupWorkbenchTest();

  it('stays read-only until requested and commits one revision-bound document', async () => {
    const document = connectedNamesProjectionDraft();
    const lookup = new CanvasRelationAnalysisSession('derived-output-test-identity');
    lookup.receive(document);
    const relationId = lookup.rootId;
    const onChange = vi.fn();

    function Host({ snapshot = document }: { snapshot?: typeof document }): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(snapshot, 'derived-output-section');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasDerivedOutputSection relationId={relationId} onChange={onChange} />
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

    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-cancel"]')!)
    );
    expect(container.querySelector('[data-slot="canvas-derived-output-form"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-derived-output-trigger"]')!)
    );
    const baseFunction = container.querySelector<HTMLSelectElement>('select[name="capabilityId"]')!;
    const trim = [...baseFunction.options].find((option) => option.textContent === 'TRIM');
    if (trim == null) throw new Error('Expected TRIM capability.');
    await act(async () => fireEvent.change(baseFunction, { target: { value: trim.value } }));
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="derived-expression-add-wrapper"]')!)
    );
    const wrapper = container.querySelector<HTMLSelectElement>('select[name="capabilityId"]')!;
    const upper = [...wrapper.options].find((option) => option.textContent === 'UPPER');
    if (upper == null) throw new Error('Expected UPPER capability.');
    await act(async () => fireEvent.change(wrapper, { target: { value: upper.value } }));
    expect(
      container.querySelector('[data-slot="graph-node-column-function-expression"]')?.textContent
    ).toContain('UPPER(TRIM(');
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
    if (project?.relation.relType.case !== 'project') throw new Error('Expected ProjectRel.');
    const expression = project.relation.relType.value.expressions.at(-1)?.rexType;
    expect(expression?.case).toBe('scalarFunction');
    if (expression?.case !== 'scalarFunction') throw new Error('Expected outer scalar function.');
    const argument = expression.value.arguments[0]?.argType;
    expect(argument?.case).toBe('value');
    if (argument?.case !== 'value') throw new Error('Expected scalar function argument.');
    expect(argument.value.rexType.case).toBe('scalarFunction');
    expect(
      onChange.mock.calls[0]![0].sidecar.fields.some(
        (field: { displayName?: string }) => field.displayName === 'normalized_name'
      )
    ).toBe(true);
  });

  it('authors a direct text constant as a visual formula node', async () => {
    const document = connectedNamesProjectionDraft();
    const lookup = new CanvasRelationAnalysisSession('derived-output-literal-identity');
    lookup.receive(document);
    const relationId = lookup.rootId;
    const onChange = vi.fn();

    function Host(): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(document, 'derived-output-literal');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasDerivedOutputSection relationId={relationId} onChange={onChange} />
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
    await act(async () =>
      fireEvent.change(container.querySelector('[data-slot="derived-expression-kind"]')!, {
        target: { value: 'string-literal' },
      })
    );
    await act(async () =>
      fireEvent.change(container.querySelector('[data-slot="derived-expression-literal-value"]')!, {
        target: { value: 'web' },
      })
    );
    await act(async () =>
      fireEvent.change(container.querySelector<HTMLInputElement>('input[name="alias"]')!, {
        target: { value: 'channel' },
      })
    );
    await act(async () => fireEvent.submit(container.querySelector('form')!));

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    const indexed = indexSubstraitRelations(onChange.mock.calls[0]![0]);
    if (!indexed.ok) throw indexed.error;
    const project = indexed.index.relations.get(relationId);
    if (project?.relation.relType.case !== 'project') throw new Error('Expected ProjectRel.');
    const expression = project.relation.relType.value.expressions.at(-1)?.rexType;
    expect(expression?.case).toBe('literal');
    if (expression?.case !== 'literal') throw new Error('Expected literal expression.');
    expect(expression.value.literalType).toEqual({ case: 'string', value: 'web' });
  });

  it('authors COALESCE from a nested field function and a text constant', async () => {
    const document = connectedNamesProjectionDraft();
    const lookup = new CanvasRelationAnalysisSession('derived-output-branch-ui');
    lookup.receive(document);
    const relationId = lookup.rootId;
    const onChange = vi.fn();

    function Host(): React.JSX.Element {
      const analysis = useCanvasRelationAnalysisSession(document, 'derived-output-branch-ui');
      return (
        <CanvasRelationAnalysisContext.Provider value={analysis}>
          <CanvasDerivedOutputSection relationId={relationId} onChange={onChange} />
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

    const rootFunction = container.querySelector<HTMLSelectElement>('select[name="capabilityId"]')!;
    const coalesce = [...rootFunction.options].find((option) => option.textContent === 'COALESCE');
    if (coalesce == null) throw new Error('Expected COALESCE capability.');
    await act(async () =>
      fireEvent.change(rootFunction, { target: { value: coalesce.value } })
    );

    const argumentsList = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="derived-expression-argument"]'),
    ].filter((element) => element.dataset.depth === '0');
    expect(argumentsList.length).toBeGreaterThanOrEqual(2);

    const firstKind = argumentsList[0]!.querySelector<HTMLSelectElement>(
      '[data-slot="derived-expression-node-kind"]'
    )!;
    await act(async () => fireEvent.change(firstKind, { target: { value: 'function' } }));
    const nestedFunction = argumentsList[0]!.querySelector<HTMLSelectElement>(
      '[data-slot="derived-expression-function-select"]'
    )!;
    const trim = [...nestedFunction.options].find((option) => option.textContent === 'TRIM');
    if (trim == null) throw new Error('Expected nested TRIM capability.');
    await act(async () => fireEvent.change(nestedFunction, { target: { value: trim.value } }));

    const refreshedArguments = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="derived-expression-argument"]'),
    ].filter((element) => element.dataset.depth === '0');
    const secondKind = refreshedArguments[1]!.querySelector<HTMLSelectElement>(
      '[data-slot="derived-expression-node-kind"]'
    )!;
    await act(async () =>
      fireEvent.change(secondKind, { target: { value: 'string-literal' } })
    );
    const literal = refreshedArguments[1]!.querySelector<HTMLInputElement>(
      '[data-slot="derived-expression-literal-value"]'
    )!;
    await act(async () => fireEvent.change(literal, { target: { value: 'UNKNOWN' } }));

    expect(
      container.querySelector('[data-slot="graph-node-column-function-expression"]')?.textContent
    ).toContain('COALESCE(TRIM(');
    expect(
      container.querySelector('[data-slot="graph-node-column-function-expression"]')?.textContent
    ).toContain('"UNKNOWN"');

    await act(async () =>
      fireEvent.change(container.querySelector<HTMLInputElement>('input[name="alias"]')!, {
        target: { value: 'display_name' },
      })
    );
    await act(async () => fireEvent.submit(container.querySelector('form')!));

    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    const indexed = indexSubstraitRelations(onChange.mock.calls[0]![0]);
    if (!indexed.ok) throw indexed.error;
    const project = indexed.index.relations.get(relationId);
    if (project?.relation.relType.case !== 'project') throw new Error('Expected ProjectRel.');
    const expression = project.relation.relType.value.expressions.at(-1)?.rexType;
    expect(expression?.case).toBe('scalarFunction');
    if (expression?.case !== 'scalarFunction') throw new Error('Expected COALESCE scalar.');
    expect(expression.value.arguments).toHaveLength(2);
    const first = expression.value.arguments[0]?.argType;
    const second = expression.value.arguments[1]?.argType;
    if (first?.case !== 'value' || second?.case !== 'value')
      throw new Error('Expected value arguments.');
    expect(first.value.rexType.case).toBe('scalarFunction');
    expect(second.value.rexType).toMatchObject({
      case: 'literal',
      value: { literalType: { case: 'string', value: 'UNKNOWN' } },
    });
  });
});
