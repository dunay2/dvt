// @vitest-environment jsdom
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { clone } from '@bufbuild/protobuf';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { ConnectionRef } from '@dvt/contracts';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import { repeatedOccurrenceDraft } from './relational-source-occurrence/occurrence.test.fixtures';
import { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

describe('Workbench analysis ownership', () => {
  setupWorkbenchTest();

  it('retains the published analysis across equivalent graph eligibility allocations', async () => {
    const document = repeatedOccurrenceDraft();
    let denied = new Set<string>();
    let disconnected = new Set<string>();
    let analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    function Host(): React.JSX.Element {
      analysis = useCanvasRelationAnalysisSession(
        document,
        'pending-form',
        undefined,
        denied,
        disconnected
      );
      return <output>{analysis?.revision}</output>;
    }
    await act(async () => root.render(<Host />));
    const accepted = analysis!;
    denied = new Set(denied);
    disconnected = new Set(disconnected);
    await act(async () => root.render(<Host />));
    expect(analysis!).toBe(accepted);
  });

  it('publishes real eligibility and connection changes without retaining an old grant', async () => {
    const document = repeatedOccurrenceDraft();
    let denied = new Set<string>();
    let disconnected = new Set<string>();
    let connection: ConnectionRef = {
      schemaVersion: 'connection-ref.v1',
      provider: 'postgres',
      connectionId: 'warehouse',
    };
    let analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    function Host(): React.JSX.Element {
      analysis = useCanvasRelationAnalysisSession(
        document,
        'authorized-form',
        connection,
        denied,
        disconnected
      );
      return <output>{analysis?.revision}</output>;
    }
    await act(async () => root.render(<Host />));
    const accepted = analysis!;
    const field = (await accepted.session.query(null)).fields[0]!;
    expect(accepted.session.allowsInputSchema(field)).toBe(true);
    denied = new Set(field.sourceFieldIds);
    await act(async () => root.render(<Host />));
    expect(analysis!).not.toBe(accepted);
    expect(analysis!.session).toBe(accepted.session);
    expect(analysis!.revision).toBe(accepted.revision);
    expect(analysis!.session.allowsInputSchema(field)).toBe(false);
    expect(analysis!.session.canEditRetainedJoinOutput(analysis!.session.rootId)).toBe(false);
    const deniedAnalysis = analysis!;
    disconnected = new Set(denied);
    await act(async () => root.render(<Host />));
    expect(analysis!).not.toBe(deniedAnalysis);
    expect(analysis!.session.canEditRetainedJoinOutput(analysis!.session.rootId)).toBe(true);
    connection = { ...connection, connectionId: 'another-warehouse' };
    await act(async () => root.render(<Host />));
    expect(analysis!.session).not.toBe(accepted.session);
    expect(() => analysis!.session.executionProvider(analysis!.revision)).toThrowError(
      expect.objectContaining({ code: 'invalid_binding' })
    );
    expect(analysis!.session.allowsInputSchema(field)).toBe(false);
    await expect(accepted.session.query(null)).rejects.toMatchObject({ code: 'stale_document' });
  });

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
