// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { fireEvent } from '@testing-library/dom';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { RelationAnalysisTestHost } from './SelectedUnaryForm.test-support';
import {
  setupWorkbenchTest,
  root,
  container,
  COPY,
} from './CanvasRelationalTreeWorkbench.test-support';
import { graphJoin } from './canvasRelationGraph.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';

describe('selected JOIN type control', () => {
  setupWorkbenchTest();
  it('opens a configured JOIN glyph independently and cancels its working-copy change', async () => {
    const { transform, sources, edges } = buildSemanticWorkbenchFixture();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    const render = async (editable: boolean): Promise<void> => {
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={transform}
            nodes={[...sources, transform]}
            edges={edges}
            copy={COPY}
            authoring={{ canEditNode: editable, onApplyNodeDraft }}
          />
        )
      );
    };
    const trigger = '[data-slot="canvas-join-type-trigger"]';
    const card = '[data-slot="canvas-relational-tree-node"][data-operator="join"]';
    await render(false);
    expect(container.querySelector(card)).not.toBeNull();
    expect(container.querySelector(trigger)).toBeNull();
    await render(true);
    const button = container.querySelector<HTMLButtonElement>(trigger);
    expect(button).not.toBeNull();
    expect(button!.closest('[role="treeitem"]')).toBeNull();
    const previouslySelected = container.querySelector('[aria-selected="true"][role="treeitem"]');
    await act(async () => fireEvent.keyDown(button!, { key: 'Enter' }));
    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
    expect(container.querySelector('[aria-selected="true"][role="treeitem"]')).toBe(
      previouslySelected
    );
    const left = options.find((item) => item.textContent === 'LEFT JOIN');
    expect(left).toBeDefined();
    await act(async () => fireEvent.click(left!));
    expect(container.querySelector(card)?.textContent).toContain('LEFT JOIN');
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-relational-tree-cancel"]')!)
    );
    expect(container.querySelector(card)?.textContent).toContain('INNER JOIN');
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it.each([JoinRel_JoinType.LEFT, JoinRel_JoinType.RIGHT, JoinRel_JoinType.OUTER])(
    'persists type %s without replacing the selected relation',
    async (joinType) => {
      const { document, session } = graphJoin();
      const id = session.rootId;
      let saved = document;
      function Host(): React.JSX.Element {
        const [draft, setDraft] = useState(document);
        return (
          <RelationAnalysisTestHost document={draft}>
            <CanvasRelationalTreeJoinEditor
              copy={COPY}
              selectedRelationId={id}
              onChange={(next) => {
                saved = next;
                setDraft(next);
              }}
            />
          </RelationAnalysisTestHost>
        );
      }
      await act(async () => root.render(<Host />));
      const select = container.querySelector<HTMLSelectElement>(
        '[data-slot="canvas-relational-tree-join-type"]'
      )!;
      expect(
        Array.from(select.options).find(
          (option) => Number(option.value) === JoinRel_JoinType.LEFT_SEMI
        )?.disabled
      ).toBe(true);
      await act(async () => fireEvent.change(select, { target: { value: String(joinType) } }));
      const sql = await projectSubstraitToPostgresSql(saved);
      const expectedSql = joinType === JoinRel_JoinType.OUTER ? 'FULL' : JoinRel_JoinType[joinType];
      expect(sql.sql).toMatch(new RegExp(expectedSql + '(?: OUTER)? JOIN', 'i'));
      const reopened = new CanvasRelationAnalysisSession('model');
      reopened.receive(saved);
      expect(await querySelectedJoin(reopened, id, reopened.revision)).toMatchObject({
        type: joinType,
      });
      expect(saved.sidecar.relations.map((binding) => binding.relationId)).toEqual(
        document.sidecar.relations.map((binding) => binding.relationId)
      );
      expect(container.querySelector('[role="alert"]')).toBeNull();
    }
  );
});
