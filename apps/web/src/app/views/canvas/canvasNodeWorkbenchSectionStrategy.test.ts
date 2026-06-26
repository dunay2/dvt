import { describe, expect, it } from 'vitest';

import { resolveNodeWorkbenchPrimarySectionIds } from './canvasNodeWorkbenchSectionStrategy';

describe('canvasNodeWorkbenchSectionStrategy', () => {
  it('translates DBT/DVT surface sections into node property read-model sections', () => {
    expect(
      resolveNodeWorkbenchPrimarySectionIds([
        'properties',
        'columns',
        'sql',
        'sink',
        'preview',
        'runs',
      ])
    ).toEqual(['general', 'columns', 'code']);

    expect(
      resolveNodeWorkbenchPrimarySectionIds([
        'properties',
        'columns',
        'tests',
        'lineage',
        'preview',
        'runs',
      ])
    ).toEqual(['general', 'columns', 'tests', 'inputs-outputs']);
  });
});
