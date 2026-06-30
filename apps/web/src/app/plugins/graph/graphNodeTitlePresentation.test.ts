import { describe, expect, it } from 'vitest';

import { buildGraphNodeTitlePresentation } from './graphNodeTitlePresentation';

describe('buildGraphNodeTitlePresentation', () => {
  it('humanizes source relation context while preserving the technical node name', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'source_1_raw.source_1',
        kind: 'dvt:source',
        metadata: {
          database: 'postgres',
          schema: 'public',
          table: 'source_1',
        },
      })
    ).toEqual({
      title: 'Postgres · public',
      technicalName: 'source_1_raw.source_1',
    });
  });

  it('keeps model names readable without inventing missing relation metadata', () => {
    expect(
      buildGraphNodeTitlePresentation({
        nodeName: 'orders_model',
        kind: 'dbt:model',
        metadata: {},
      })
    ).toEqual({
      title: 'Orders Model',
      technicalName: 'orders_model',
    });
  });
});
