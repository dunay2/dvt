// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode, buildJoinWarehouseSourceNode } from './DvtAuthoringFields.test-fixtures';

describe('pending Transform inspector boundary', () => {
  const view = useAuthoringFieldsHarness();

  it.each(['general', 'columns', 'code', 'all'] as const)(
    'does not initialize semantic authority from the %s section',
    (section) => {
      const source = buildJoinWarehouseSourceNode({
        id: 'source-customers',
        table: 'customers',
        columns: ['customer_id', 'name'],
      });
      const transform = buildDvtNode('dvt:transform');
      view.renderFields(
        transform,
        undefined,
        undefined,
        [source, transform],
        [
          {
            id: 'customers-transform',
            sourceId: source.id,
            targetId: transform.id,
            relation: 'lineage',
          },
        ],
        section
      );

      expect(
        view.container.querySelector('[data-slot="dvt-start-substrait-projection"]')
      ).toBeNull();
      expect(
        view.container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
      ).toBeNull();
      expect(JSON.parse(view.draftJson())).toMatchObject({
        kind: 'transform',
        mode: 'uninitialized',
      });
    }
  );
});
