import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { DbtProjectSemanticRegion } from '../../src/application/ports/dbtProjectAnalysis.js';
import { planDbtSemanticRegionPatch } from '../../src/application/services/dbtDependencyEdit/dbtSemanticRegionPatchPlanner.js';

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function supportedRegion(
  content: string,
  source: string,
  kind: 'ref' | 'source'
): Extract<DbtProjectSemanticRegion, { classification: 'supported' }> {
  const start = content.indexOf(source);
  return {
    regionId: `dbt-region:${sha256(source)}`,
    ownerUniqueIds: ['model.analytics.orders'],
    path: 'models/orders.sql',
    kind,
    range: {
      startByte: Buffer.byteLength(content.slice(0, start), 'utf8'),
      endByte: Buffer.byteLength(content.slice(0, start + source.length), 'utf8'),
    },
    sourceSha256: sha256(source),
    classification: 'supported' as const,
    targetUniqueId: kind === 'ref' ? 'model.analytics.customers' : 'source.analytics.raw.orders',
  };
}

describe('planDbtSemanticRegionPatch', () => {
  it('changes only the literal in a one-argument ref across UTF-8 byte offsets', () => {
    const source = "{{  ref ( 'customers' )  }}";
    const content = `select 'á' as marker from ${source}\n-- preserve this comment`;
    const result = planDbtSemanticRegionPatch({
      content,
      region: supportedRegion(content, source, 'ref'),
      nextTarget: {
        uniqueId: 'model.analytics.accounts',
        resourceType: 'model',
        name: 'accounts',
        packageName: 'analytics',
        dependencyUniqueIds: [],
        macroUniqueIds: [],
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'patched',
        content: "select 'á' as marker from {{  ref ( 'accounts' )  }}\n-- preserve this comment",
      })
    );
  });

  it('preserves quote style and spacing for qualified refs and sources', () => {
    const qualifiedRef = '{{ ref("package_one" ,  "customers") }}';
    const refResult = planDbtSemanticRegionPatch({
      content: qualifiedRef,
      region: supportedRegion(qualifiedRef, qualifiedRef, 'ref'),
      nextTarget: {
        uniqueId: 'model.package_two.accounts',
        resourceType: 'model',
        name: 'accounts',
        packageName: 'package_two',
        dependencyUniqueIds: [],
        macroUniqueIds: [],
      },
    });
    expect(refResult).toEqual(
      expect.objectContaining({
        kind: 'patched',
        content: '{{ ref("package_two" ,  "accounts") }}',
      })
    );

    const source = '{{ source( \'raw\' , "orders" ) }}';
    const sourceResult = planDbtSemanticRegionPatch({
      content: source,
      region: supportedRegion(source, source, 'source'),
      nextTarget: {
        uniqueId: 'source.analytics.curated.accounts',
        resourceType: 'source',
        name: 'accounts',
        sourceName: 'curated',
        packageName: 'analytics',
        dependencyUniqueIds: [],
        macroUniqueIds: [],
      },
    });
    expect(sourceResult).toEqual(
      expect.objectContaining({
        kind: 'patched',
        content: '{{ source( \'curated\' , "accounts" ) }}',
      })
    );
  });

  it('returns no change only after proving the authoritative source region', () => {
    const source = "{{ ref('customers') }}";
    const result = planDbtSemanticRegionPatch({
      content: source,
      region: supportedRegion(source, source, 'ref'),
      nextTarget: {
        uniqueId: 'model.analytics.customers',
        resourceType: 'model',
        name: 'customers',
        packageName: 'analytics',
        dependencyUniqueIds: [],
        macroUniqueIds: [],
      },
    });

    expect(result).toEqual({ kind: 'no_change' });
  });

  it('refuses code-only, incompatible, unsafe, and stale regions', () => {
    const source = "{{ ref('customers') }}";
    const region = supportedRegion(source, source, 'ref');
    const nextSource = {
      uniqueId: 'source.analytics.raw.orders',
      resourceType: 'source' as const,
      name: 'orders',
      sourceName: 'raw',
      packageName: 'analytics',
      dependencyUniqueIds: [],
      macroUniqueIds: [],
    };

    expect(
      planDbtSemanticRegionPatch({
        content: source,
        region: { ...region, classification: 'code_only', reasonCode: 'dbt_jinja_expression' },
        nextTarget: nextSource,
      })
    ).toEqual({ kind: 'refused', reason: 'region_code_only' });
    expect(planDbtSemanticRegionPatch({ content: source, region, nextTarget: nextSource })).toEqual(
      { kind: 'refused', reason: 'target_incompatible' }
    );
    expect(
      planDbtSemanticRegionPatch({
        content: source,
        region,
        nextTarget: {
          ...nextSource,
          uniqueId: 'model.analytics.unsafe',
          resourceType: 'model',
          name: "unsafe'name",
        },
      })
    ).toEqual({ kind: 'refused', reason: 'literal_unrepresentable' });
    expect(
      planDbtSemanticRegionPatch({
        content: source.replace('customers', 'changed'),
        region,
        nextTarget: {
          ...nextSource,
          uniqueId: 'model.analytics.accounts',
          resourceType: 'model',
          name: 'accounts',
        },
      })
    ).toEqual({ kind: 'refused', reason: 'source_revision_mismatch' });
  });
});
