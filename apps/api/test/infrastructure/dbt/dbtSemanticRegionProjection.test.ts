import { describe, expect, it } from 'vitest';

import { projectDbtSemanticRegions } from '../../../src/infrastructure/dbt/dbtSemanticRegionProjection.js';

const identities = [
  {
    uniqueId: 'model.analytics.orders',
    resourceType: 'model' as const,
    name: 'orders',
    packageName: 'analytics',
    originalFilePath: 'models/orders.sql',
    dependencyUniqueIds: ['model.analytics.customers', 'source.analytics.raw.orders'],
    macroUniqueIds: [],
  },
  {
    uniqueId: 'model.analytics.customers',
    resourceType: 'model' as const,
    name: 'customers',
    packageName: 'analytics',
    originalFilePath: 'models/customers.sql',
    dependencyUniqueIds: [],
    macroUniqueIds: [],
  },
  {
    uniqueId: 'source.analytics.raw.orders',
    resourceType: 'source' as const,
    name: 'orders',
    sourceName: 'raw',
    packageName: 'analytics',
    originalFilePath: 'models/sources.yml',
    dependencyUniqueIds: [],
    macroUniqueIds: [],
  },
] as const;

describe('projectDbtSemanticRegions', () => {
  it('projects manifest-confirmed ref and source calls with UTF-8 byte ranges', () => {
    const content =
      "select 'á' as marker from {{ ref('customers') }} join {{ source('raw', 'orders') }}";

    const result = projectDbtSemanticRegions({
      identities,
      files: [{ path: 'models/orders.sql', content }],
    });

    expect(result.regions).toEqual([
      expect.objectContaining({
        ownerUniqueIds: ['model.analytics.orders'],
        kind: 'ref',
        classification: 'supported',
        targetUniqueId: 'model.analytics.customers',
        range: {
          startByte: Buffer.byteLength("select 'á' as marker from ", 'utf8'),
          endByte: Buffer.byteLength("select 'á' as marker from {{ ref('customers') }}", 'utf8'),
        },
      }),
      expect.objectContaining({
        ownerUniqueIds: ['model.analytics.orders'],
        kind: 'source',
        classification: 'supported',
        targetUniqueId: 'source.analytics.raw.orders',
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('preserves ambiguous, mixed and unsupported Jinja as code-only evidence', () => {
    const content = [
      '{{ ref(variable_model) }}',
      "{{ ref('missing') }}",
      '{% if execute %}',
      '{# keep this comment #}',
    ].join('\n');

    const result = projectDbtSemanticRegions({
      identities,
      files: [{ path: 'models/orders.sql', content }],
    });

    expect(
      result.regions.map((region) => ({
        kind: region.kind,
        classification: region.classification,
        ...('reasonCode' in region ? { reasonCode: region.reasonCode } : {}),
      }))
    ).toEqual([
      { kind: 'jinja', classification: 'code_only', reasonCode: 'dbt_jinja_dynamic_argument' },
      { kind: 'ref', classification: 'code_only', reasonCode: 'dbt_ref_not_manifest_confirmed' },
      { kind: 'jinja', classification: 'code_only', reasonCode: 'dbt_jinja_statement' },
      { kind: 'jinja', classification: 'code_only', reasonCode: 'dbt_jinja_comment' },
    ]);
    expect(result.diagnostics).toHaveLength(4);
    expect(result.diagnostics[0]).toEqual(
      expect.objectContaining({
        code: 'dbt_semantic_region_code_only',
        severity: 'warning',
        subject: expect.objectContaining({
          kind: 'region',
          path: 'models/orders.sql',
        }),
        evidence: expect.objectContaining({ path: 'models/orders.sql' }),
      })
    );
  });

  it('refuses to infer a supported region when multiple manifest identities match', () => {
    const result = projectDbtSemanticRegions({
      identities: [
        {
          ...identities[0],
          dependencyUniqueIds: [
            ...identities[0].dependencyUniqueIds,
            'model.package_two.customers',
          ],
        },
        ...identities.slice(1),
        {
          uniqueId: 'model.package_two.customers',
          resourceType: 'model' as const,
          name: 'customers',
          packageName: 'package_two',
          originalFilePath: 'packages/customers.sql',
          dependencyUniqueIds: [],
          macroUniqueIds: [],
        },
      ],
      files: [{ path: 'models/orders.sql', content: "select * from {{ ref('customers') }}" }],
    });

    expect(result.regions).toEqual([
      expect.objectContaining({
        kind: 'ref',
        classification: 'code_only',
        reasonCode: 'dbt_ref_ambiguous',
      }),
    ]);
  });
});
