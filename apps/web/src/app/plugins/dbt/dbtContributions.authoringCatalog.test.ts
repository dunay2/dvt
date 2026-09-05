import { describe, expect, it } from 'vitest';

import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';
import { dbtContributions } from './dbtContributions';

describe('dbt plugin node catalog', () => {
  it('retains dbt node capabilities without registering a dbt Canvas species', () => {
    expect(dbtContributions.nodeKinds?.map((registration) => registration.kind)).toEqual(
      DBT_NODE_KINDS.map((registration) => registration.kind)
    );
    expect(dbtContributions.canvasKinds).toBeUndefined();
  });
});
