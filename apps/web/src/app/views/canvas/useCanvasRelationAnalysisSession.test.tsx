// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { clone } from '@bufbuild/protobuf';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import { repeatedOccurrenceDraft } from './relational-source-occurrence/occurrence.test.fixtures';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

describe('Workbench analysis ownership', () => {
  setupWorkbenchTest();

  it('keeps hot fields across selection, layout renders and its own local edits', async () => {
    const draft = repeatedOccurrenceDraft();
    let document = draft;
    let analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    function Host(): React.JSX.Element {
      analysis = useCanvasRelationAnalysisSession(document, 'authorized-model');
      return <output>{analysis?.revision}</output>;
    }
    await act(async () => root.render(<Host />));
    const session = analysis!.session;
    const first = await session.query(null);
    const before = session.work;
    await act(async () => root.render(<Host />));
    expect(analysis!.session).toBe(session);
    expect(await session.query(null)).toEqual(first);
    expect(session.work).toEqual(before);
    const indexed = indexSubstraitRelations(draft);
    if (!indexed.ok) throw indexed.error;
    const entry = [...indexed.index.relations.values()].find(
      (item) => item.relation.relType.case === 'read'
    )!;
    await act(async () => {
      document = session.apply({
        expectedRevision: first.revision,
        upserts: [
          {
            relation: clone(RelSchema, entry.relation),
            binding: { ...entry.binding, displayName: 'Other role' },
            fields: entry.fields,
          },
        ],
        removed: [],
      });
      root.render(<Host />);
    });
    const changed = await session.query(null);
    expect(analysis!.session).toBe(session);
    expect(changed.fingerprint).toBe(first.fingerprint);
    expect(changed.fields).toEqual(first.fields);
    expect(session.work.analyzed).toBe(before.analyzed);
    await expect(session.query('absent')).rejects.toMatchObject({ code: 'unknown_relation' });
    act(() => root.render(<div />));
    await expect(session.query(null)).rejects.toMatchObject({ code: 'stale_document' });
  });
});
