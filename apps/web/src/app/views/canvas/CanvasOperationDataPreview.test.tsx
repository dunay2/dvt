// @vitest-environment jsdom
import { act, useContext } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TransformDataSampleResponseSchema,
  type TransformDataSampleResponse,
} from '@dvt/contracts';
import {
  CanvasOperationPreviewContext,
  CanvasOperationPreviewProvider,
} from './CanvasOperationDataPreview';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

function Execute({ relationId }: Readonly<{ relationId: string }>): JSX.Element {
  const context = useContext(CanvasOperationPreviewContext);
  return (
    <button
      data-slot="test-execute"
      disabled={context?.unapplied}
      onClick={() => context?.execute(relationId, 'INNER JOIN')}
    >
      Execute
    </button>
  );
}

describe('selected operation data preview', () => {
  let container: HTMLDivElement;
  let controls: HTMLDivElement;
  let root: Root;
  const digest = 'a'.repeat(64);
  const query = { previewTransformRows: vi.fn() };
  const sample = (relationId: string): TransformDataSampleResponse =>
    TransformDataSampleResponseSchema.parse({
      contractVersion: 1,
      canvasId: 'canvas-test',
      transformNodeId: 'model',
      relationId,
      semanticPlanSha256: digest,
      draftRevision: 'r7',
      columns: [{ name: 'id', type: 'integer', nullable: false }],
      rows: [{ values: ['intermediate-result'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-19T00:00:00.000Z',
    });
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    controls = document.createElement('div');
    document.body.append(container, controls);
    root = createRoot(controls);
    query.previewTransformRows.mockReset();
    useApplicationLanguageStore.setState({ language: 'en' });
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    controls.remove();
    useApplicationLanguageStore.setState({ language: 'en' });
  });
  function render(relationId: string, unapplied = false): void {
    act(() =>
      root.render(
        <CanvasOperationPreviewProvider
          ports={{ canvasId: 'canvas-test', query, dataHost: container }}
          nodeId="model"
          semanticDigest={digest}
          canEditModel={false}
          unapplied={unapplied}
        >
          <Execute relationId={relationId} />
        </CanvasOperationPreviewProvider>
      )
    );
  }
  async function preview(): Promise<void> {
    await act(async () => {
      controls.querySelector<HTMLButtonElement>('[data-slot="test-execute"]')!.click();
    });
  }
  it.each([
    { language: 'es' as const, count: 3, limit: 20, truncated: false, expected: '3/20 registros' },
    { language: 'es' as const, count: 0, limit: 20, truncated: false, expected: '0/20 registros' },
    { language: 'en' as const, count: 20, limit: 20, truncated: true, expected: '20/20 records' },
    { language: 'en' as const, count: 1, limit: 10, truncated: false, expected: '1/10 records' },
  ])(
    'shows only the operation label and $expected in the compact header',
    async ({ language, count, limit, truncated, expected }) => {
      useApplicationLanguageStore.setState({ language });
      query.previewTransformRows.mockResolvedValue({
        ...sample('join-1'),
        rows: Array.from({ length: count }, () => ({ values: ['result'] })),
        limit,
        truncated,
      });
      render('join-1');
      expect(container.querySelector('h2')).toBeNull();
      expect(container.querySelector('[data-slot="canvas-operation-record-count"]')).toBeNull();
      await preview();
      const header = container.querySelector('header');
      expect(header?.textContent).toBe(`INNER JOIN${expected}`);
      expect(header?.querySelector('p')).toBeNull();
      expect(container.querySelector('code')).toBeNull();
      expect(container.querySelector('time')).toBeNull();
      expect(container.textContent).not.toContain('r7');
      expect(
        container.querySelector('header')?.querySelector('[data-slot="canvas-model-preview"]')
      ).not.toBeNull();
      render('join-2');
      expect(
        container.querySelector('[data-slot="canvas-operation-record-count"]')?.textContent
      ).toBe(expected);
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
    }
  );
  it('requests a bounded relation and retains its sample when another card is selected', async () => {
    query.previewTransformRows.mockResolvedValue(sample('join-1'));
    render('join-1');
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    await preview();
    expect(query.previewTransformRows).toHaveBeenCalledWith({
      canvasId: 'canvas-test',
      transformNodeId: 'model',
      relationId: 'join-1',
      semanticPlanSha256: digest,
      limit: 20,
    });
    expect(container.querySelector('table')?.textContent).toContain('intermediate-result');
    render('join-2');
    expect(container.querySelector('table')?.textContent).toContain('intermediate-result');
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
  });
  it('ignores a response arriving after another operation is executed', async () => {
    let resolve!: (result: TransformDataSampleResponse) => void;
    query.previewTransformRows.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    render('join-1');
    await preview();
    render('join-2');
    query.previewTransformRows.mockResolvedValue(sample('join-2'));
    await preview();
    await act(async () => {
      resolve({ ...sample('join-1'), rows: [{ values: ['late-first-operation'] }] });
    });
    expect(container.querySelector('table')?.textContent).toContain('intermediate-result');
    expect(container.querySelector('table')?.textContent).not.toContain('late-first-operation');
    expect(container.querySelector('aside')?.dataset.relationId).toBe('join-2');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
  it('blocks unapplied edits and rejects data tagged with another relation', async () => {
    render('join-1', true);
    expect(controls.querySelector<HTMLButtonElement>('[data-slot="test-execute"]')!.disabled).toBe(
      true
    );
    await preview();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    render('join-1');
    query.previewTransformRows.mockResolvedValue(sample('join-2'));
    await preview();
    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
