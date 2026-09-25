// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import { graphJoin, graphModel } from './canvasRelationGraph.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { useCanvasRelationOutputCommand } from './useCanvasRelationOutputCommand';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasColumnMappingResult } from './canvasColumnMappingModel';
import type { Mock } from 'vitest';

type OutputFields = SubstraitDocument['sidecar']['fields'];
type OutputCommand = ReturnType<typeof useCanvasRelationOutputCommand>;
function harness(): {
  fields: readonly OutputFields[number][];
  outputs: () => readonly OutputFields[number][];
  fallback: Mock<() => CanvasColumnMappingResult>;
  submit: (intent: Parameters<OutputCommand>[0]) => ReturnType<OutputCommand>;
  current: CanvasDraftSession;
  replaceAuthority: () => ReturnType<typeof graphModel>;
} {
  const { document, session } = graphJoin();
  const model = graphModel(document);
  const fields = session.locate(session.rootId, session.revision).fields;
  let current: CanvasDraftSession = {
    syncState: 'editing',
    baseline: { record: null },
    draftRevision: 'rev-1',
    workingSet: { visibleNodeIds: [model.id], visibleEdges: [], pendingExplicitNodeIds: [] },
    localNodeCatalog: { [model.id]: model },
  };
  const run: CanvasDraftSessionCommandRunner = (command) => {
    const result = command(current);
    if (result.outcome === 'applied') current = result.draftSession;
    return result;
  };
  let submit!: ReturnType<typeof useCanvasRelationOutputCommand>;
  function Host(): null {
    submit = useCanvasRelationOutputCommand(new Map([[model.id, model]]), run);
    return null;
  }
  act(() => root.render(<Host />));
  const fallback = vi.fn(() => ({
    outcome: 'rejected' as const,
    reason: 'invalid_transform_authority' as const,
  }));
  const outputs = (): readonly OutputFields[number][] => {
    const authority = readDvtTransformAuthoringAuthority(current.localNodeCatalog![model.id]!)!;
    const result = deriveSubstraitSchemas(
      decodeDvtSubstraitSemanticDocument(authority.semanticDocument)
    );
    return result.index.relations.get(result.index.rootId)!.fields;
  };
  return {
    fields,
    outputs,
    fallback,
    submit: (intent: Parameters<typeof submit>[0]) => submit(intent, fallback),
    get current() {
      return current;
    },
    replaceAuthority() {
      const replacement = graphModel(graphJoin().document);
      current = { ...current, localNodeCatalog: { [model.id]: replacement } };
      return replacement;
    },
  };
}

describe('canonical card output command', () => {
  setupWorkbenchTest();
  it('serializes overlapping reorder and exclusion against the latest canonical draft', async () => {
    const h = harness();
    const first = h.fields[0]!;
    const last = h.fields.at(-1)!;
    const results = await Promise.all([
      h.submit({
        nodeId: 'model',
        columnId: last.fieldId,
        targetColumnId: first.fieldId,
        placement: 'before',
      }),
      h.submit({ nodeId: 'model', columnId: first.fieldId, columnType: 'string', output: false }),
    ]);
    expect(results.map((result) => result.outcome)).toEqual(['applied', 'applied']);
    expect(h.outputs().map((field) => field.fieldId)).toEqual([
      last.fieldId,
      ...h.fields.slice(1, -1).map((field) => field.fieldId),
    ]);
    expect(h.fallback).not.toHaveBeenCalled();
  });

  it.each(['missing', 'self'] as const)(
    'rejects an invalid %s placement without changing authority',
    async (fault) => {
      const h = harness();
      const before = h.current;
      expect(
        await h.submit({
          nodeId: 'model',
          columnId: h.fields[0]!.fieldId,
          targetColumnId: fault === 'self' ? h.fields[0]!.fieldId : 'absent',
          placement: 'before',
        })
      ).toMatchObject({ outcome: 'rejected' });
      expect(h.current).toBe(before);
      expect(h.fallback).not.toHaveBeenCalled();
    }
  );

  it('refuses an obsolete result when authority changes during analysis', async () => {
    const h = harness();
    const original = CanvasRelationAnalysisSession.prototype.query;
    let replaced: ReturnType<typeof h.replaceAuthority> | undefined;
    const spy = vi
      .spyOn(CanvasRelationAnalysisSession.prototype, 'query')
      .mockImplementation(function (this: CanvasRelationAnalysisSession, id, signal) {
        replaced ??= h.replaceAuthority();
        return original.call(this, id, signal);
      });
    try {
      expect(
        await h.submit({
          nodeId: 'model',
          columnId: h.fields[0]!.fieldId,
          columnType: 'string',
          output: false,
        })
      ).toMatchObject({ outcome: 'rejected' });
      expect(h.current.localNodeCatalog!.model).toBe(replaced);
      expect(h.fallback).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
