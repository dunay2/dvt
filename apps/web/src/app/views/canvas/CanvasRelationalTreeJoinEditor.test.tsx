// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { describe, expect, it } from 'vitest';
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
