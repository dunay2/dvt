// @vitest-environment jsdom
/** Inspect the surviving consumer after retiring its selected input relation. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeInlineEditor } from './CanvasRelationalTreeInlineEditor';
import { RelationAnalysisTestHost } from './SelectedUnaryForm.test-support';
import {
  setupWorkbenchTest,
  root,
  container,
  COPY,
} from './CanvasRelationalTreeWorkbench.test-support';
import { graphJoin, graphModel, appendGraphSource } from './canvasRelationGraph.test-support';
import { applySelectedRelationAggregate } from './canvasSelectedRelationAggregate';
import { applySelectedRelationWindow } from './canvasSelectedRelationWindow';
import { prepareRelationRemoval } from './canvasPrepareRelationRemoval';

describe('inspection after relation retirement', () => {
  setupWorkbenchTest();
  it('shows the surviving window after its selected JOIN is retired', async () => {
    const { session, document: saved } = graphJoin();
    await appendGraphSource(session, 'third');
    const joinId = session.rootId;
    const input = await session.query(joinId);
    await applySelectedRelationAggregate(session, {
      intent: 'insert',
      relationId: joinId,
      expectedRevision: session.revision,
      fieldId: input.bindings[0]!.fieldId,
      alias: 'total',
    });
    const grouped = await session.query(session.rootId);
    const document = await applySelectedRelationWindow(session, {
      intent: 'insert',
      relationId: session.rootId,
      expectedRevision: session.revision,
      fieldId: grouped.bindings[0]!.fieldId,
      alias: 'rank',
    });
    const render = async (draft: typeof document, selected: string) =>
      act(async () =>
        root.render(
          <RelationAnalysisTestHost document={draft}>
            <CanvasRelationalTreeInlineEditor
              appendInput={null}
              copy={COPY}
              joinDraft={draft}
              selectedRelationId={selected}
              transformNode={graphModel(saved)}
              operation="inner_join"
              expanded
              onClose={() => {}}
              onChangeJoinDraft={() => {}}
              onAppendJoinInput={() => {}}
            />
          </RelationAnalysisTestHost>
        )
      );
    await render(document, joinId);
    const proposal = await prepareRelationRemoval(session, {
      relationId: joinId,
      expectedRevision: session.revision,
      keep: 'left',
    });
    const retired = session.apply(proposal.change);
    await render(retired, joinId);
    expect(container.querySelector('[data-slot="canvas-relational-expression-tree"]')).toBeNull();
    await render(retired, session.rootId);
    expect(
      container.querySelector('[data-slot="canvas-relational-expression-tree"]')
    ).not.toBeNull();
  });
});
