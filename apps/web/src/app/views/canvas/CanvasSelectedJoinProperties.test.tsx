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
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

describe('selected JOIN properties', () => {
  setupWorkbenchTest();
  it('commits a changed comparison through the real session and reopens it', async () => {
    const { document, session } = selectedUnaryScenario();
    const id = session.rootId;
    let saved: SubstraitDocument = document;
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
    reopened.receive(saved);
    expect((await querySelectedJoin(reopened, id, reopened.revision)).conditions).toMatchObject([
      { operator: 'not_equal' },
    ]);
    expect(saved.sidecar.relations).toEqual(document.sidecar.relations);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
