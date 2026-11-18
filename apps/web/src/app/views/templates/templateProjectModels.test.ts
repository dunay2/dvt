/** Prove that catalog navigation identity and SQL relation identity stay distinct. */
import { expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { projectTemplateModels } from './templateProjectModels';

const source: CanonicalNode = {
  id: 'customer-id',
  name: 'Friendly customer',
  kind: 'dvt:source',
  pluginId: 'dvt',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    config: { schema: 'Sales', table: 'Customer' },
    connectionRef: { schemaVersion: 'connection-ref.v1', provider: 'postgres', connectionId: 'db' },
  },
};
it('quotes actual Postgres coordinates and omits placements, without inventing a Snowflake relation', () => {
  const placing = { ...source, id: 'placed', definitionId: source.id };
  const items = projectTemplateModels([source, placing], undefined);
  expect(items.map((x) => x.label)).toEqual(['Friendly customer']);
  expect(items[0]?.references).toEqual({ postgresql: '"Sales"."Customer"' });
});
it('keeps unbound definitions visible without offering a physical name', () => {
  const [item] = projectTemplateModels([{ ...source, name: 'New model', metadata: {} }], undefined);
  expect(item?.label).toBe('New model');
  expect(item?.references).toEqual({});
});
