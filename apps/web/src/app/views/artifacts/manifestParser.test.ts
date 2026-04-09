import { describe, expect, it } from 'vitest';

import { parseManifest } from './manifestParser';

describe('parseManifest', () => {
  it('parses dbt manifest nodes and dependency edges', () => {
    const result = parseManifest({
      metadata: { generated_at: '2026-04-04T10:00:00Z', dbt_version: '1.8.0' },
      nodes: {
        'model.analytics.orders': {
          unique_id: 'model.analytics.orders',
          name: 'orders',
          resource_type: 'model',
          depends_on: { nodes: ['source.analytics.raw_orders'] },
        },
      },
      sources: {
        'source.analytics.raw_orders': {
          unique_id: 'source.analytics.raw_orders',
          name: 'raw_orders',
          resource_type: 'source',
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.result.nodes).toHaveLength(2);
    expect(result.result.edges).toEqual([
      {
        id: 'source.analytics.raw_orders->model.analytics.orders',
        source: 'source.analytics.raw_orders',
        target: 'model.analytics.orders',
      },
    ]);
    expect(result.result.generatedAt).toBe('2026-04-04T10:00:00Z');
    expect(result.result.dbtVersion).toBe('1.8.0');
  });

  it('rejects non-object root payloads', () => {
    const result = parseManifest('not-a-manifest');
    expect(result).toEqual({
      ok: false,
      message: 'Expected a JSON object at the root.',
    });
  });

  it('rejects manifests without recognized graph nodes', () => {
    const result = parseManifest({
      nodes: {
        invalid: {
          unique_id: 'model.analytics.invalid',
          name: 'invalid',
          resource_type: 'unsupported_resource',
        },
      },
    });

    expect(result).toEqual({
      ok: false,
      message: 'Manifest contains no recognizable dbt graph nodes.',
    });
  });
});
