// @vitest-environment jsdom
import { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode, buildJoinWarehouseSourceNode } from './DvtAuthoringFields.test-fixtures';

describe('Initialize a canonical Transform', () => {
  const view = useAuthoringFieldsHarness();
  it.each([
    ['employees', ['employee_id', 'manager_id']],
    ['countries', ['code', 'population']],
  ])(
    'starts from the complete schema of %s without embedding fixture semantics',
    async (table, columns) => {
      const input = buildJoinWarehouseSourceNode({
        id: 'input',
        table: table as string,
        columns: columns as string[],
      });
      const model = buildDvtNode('dvt:transform');
      await act(async () =>
        view.renderFields(
          model,
          undefined,
          undefined,
          [input, model],
          [{ id: 'lineage', sourceId: input.id, targetId: model.id, relation: 'lineage' }],
          'columns'
        )
      );
      await act(async () =>
        fireEvent.click(
          view.container.querySelector('[data-slot="dvt-start-substrait-projection"]')!
        )
      );
      const draft = JSON.parse(view.draftJson());
      const derived = deriveSubstraitSchemas(draft);
      expect(
        derived.index.relations.get(derived.index.rootId)!.fields.map((field) => field.displayName)
      ).toEqual(columns);
      const read = [...derived.index.relations.values()].find(
        (entry) => entry.relation.relType.case === 'read'
      )!;
      expect(read.binding.sourceRef).toEqual(input.metadata!.connectedSourceRef);
      expect(
        view.container.querySelectorAll(
          '[data-slot="relation-output-field"] input[type="checkbox"]:checked'
        )
      ).toHaveLength(columns.length);
    }
  );
});
