// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, getByLabelText, getByText } from '@testing-library/dom';
import { CanvasRelationalTreeJoinEditor } from './CanvasRelationalTreeJoinEditor';
import { RelationAnalysisTestHost } from './SelectedUnaryForm.test-support';
import {
  setupWorkbenchTest,
  root,
  container,
  COPY,
} from './CanvasRelationalTreeWorkbench.test-support';
import { graphJoin, appendGraphSource } from './canvasRelationGraph.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

describe('exact JOIN predicate selection', () => {
  setupWorkbenchTest();
  it.each(['inner', 'outer'] as const)(
    'edits only the selected %s JOIN and retains the other predicate',
    async (selection) => {
      const { session } = graphJoin();
      const inner = session.rootId;
      const document = await appendGraphSource(session, 'third');
      const outer = session.rootId;
      const id = selection === 'inner' ? inner : outer;
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
      expect(container.querySelector('[aria-label="Comparador de la condición"]')).toBeNull();
      await act(async () => fireEvent.click(getByLabelText(container, 'Editar condición')));
      await act(async () =>
        fireEvent.change(getByLabelText(container, 'Comparador de la condición'), {
          target: { value: 'not_equal' },
        })
      );
      await act(async () => fireEvent.click(getByText(container, 'Guardar condición')));
      const reopened = new CanvasRelationAnalysisSession('model');
      reopened.receive(
        decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(saved))
      );
      expect((await querySelectedJoin(reopened, id, reopened.revision)).conditions).toMatchObject([
        { operator: 'not_equal' },
      ]);
      expect(
        (await querySelectedJoin(reopened, id === inner ? outer : inner, reopened.revision))
          .conditions
      ).toMatchObject([{ operator: 'equal' }]);
      expect(
        new Map(saved.sidecar.relations.map((binding) => [binding.relationId, binding]))
      ).toEqual(
        new Map(document.sidecar.relations.map((binding) => [binding.relationId, binding]))
      );
      expect(new Map(saved.sidecar.fields.map((field) => [field.fieldId, field]))).toEqual(
        new Map(document.sidecar.fields.map((field) => [field.fieldId, field]))
      );
    }
  );
});
