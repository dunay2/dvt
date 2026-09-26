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
});
