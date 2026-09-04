import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitFilter,
  encodeDvtSubstraitFilterDocument,
  inspectDvtSubstraitFilter,
  removeDvtSubstraitFilter,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';

const UUID_V7 = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const OPAQUE_RELATION_ID = new RegExp(`^dvt_rel_${UUID_V7}$`, 'i');

const source: CanonicalNode = {
  id: 'orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: ['source'],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.orders',
    },
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ],
  },
};

function projection(): DvtSubstraitProjectionDraft {
  const resolved = resolveDvtSubstraitProjectionSource(source);
  if (resolved == null) throw new Error('Expected a valid Source fixture.');
  return createDvtSubstraitProjectionDraft({
    source: resolved,
    targetNodeId: source.id,
    outputs: resolved.fields.map((field) => ({
      fieldId: `output:${field.name}`,
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
}

function filterRelationId(draft: DvtSubstraitProjectionDraft): string | null {
  const root = draft.plan.relations[0]?.relType;
  const project = root?.case === 'root' ? root.value.input?.relType : undefined;
  const filter = project?.case === 'project' ? project.value.input?.relType : undefined;
  const anchor = filter?.case === 'filter' ? filter.value.common?.relAnchor : undefined;
  return anchor == null
    ? null
    : (draft.sidecar.relations.find((relation) => relation.relAnchor === anchor)?.relationId ?? null);
}

describe('DVT Substrait filter', () => {
  it('allocates one opaque relation identity, preserves it on edit, and replaces it after delete', () => {
    const draft = projection();
    const capability = resolveDvtSubstraitFilterCapabilities({
      dataType: 'text',
      provider: 'postgres',
    })[0];
    if (capability == null) throw new Error('Expected an admitted text predicate.');

    const filtered = applyDvtSubstraitFilter(draft, {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    });

    expect(filtered).not.toBe(draft);
    const firstRelationId = filterRelationId(filtered);
    expect(firstRelationId).toMatch(OPAQUE_RELATION_ID);
    expect(inspectDvtSubstraitFilter(filtered)).toEqual({
      fieldId: 'output:customer',
      fieldName: 'customer',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    });

    const edited = applyDvtSubstraitFilter(filtered, {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Grace',
    });
    expect(filterRelationId(edited)).toBe(firstRelationId);
    expect(inspectDvtSubstraitFilter(edited)).toMatchObject({
      fieldName: 'customer',
      value: 'Grace',
    });
    expect(
      inspectDvtSubstraitFilter(
        decodeDvtSubstraitProjectionDocument(encodeDvtSubstraitFilterDocument(edited))
      )
    ).toMatchObject({ fieldName: 'customer', value: 'Grace' });

    const removed = removeDvtSubstraitFilter(edited);
    expect(encodeDvtSubstraitProjectionDocument(removed)).toEqual(
      encodeDvtSubstraitProjectionDocument(draft)
    );

    const recreated = applyDvtSubstraitFilter(removed, {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    });
    const recreatedRelationId = filterRelationId(recreated);
    expect(recreatedRelationId).toMatch(OPAQUE_RELATION_ID);
    expect(recreatedRelationId).not.toBe(firstRelationId);
  });

  it('preserves an existing legacy-format filter ID as opaque identity when editing', () => {
    const draft = projection();
    const capability = resolveDvtSubstraitFilterCapabilities({
      dataType: 'text',
      provider: 'postgres',
    })[0];
    if (capability == null) throw new Error('Expected an admitted text predicate.');
    const filtered = applyDvtSubstraitFilter(draft, {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    });
    const createdId = filterRelationId(filtered);
    if (createdId == null) throw new Error('Expected a filter relation identity.');
    const legacyId = 'relation:legacy-target:filter';
    const legacyDraft: DvtSubstraitProjectionDraft = {
      ...filtered,
      sidecar: {
        ...filtered.sidecar,
        relations: filtered.sidecar.relations.map((relation) =>
          relation.relationId === createdId ? { ...relation, relationId: legacyId } : relation
        ),
      },
    };

    const edited = applyDvtSubstraitFilter(legacyDraft, {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Grace',
    });

    expect(filterRelationId(edited)).toBe(legacyId);
    expect(inspectDvtSubstraitFilter(edited)).toMatchObject({ value: 'Grace' });
  });

  it('rejects unsupported types, capabilities and stale field identities', () => {
    expect(
      resolveDvtSubstraitFilterCapabilities({ dataType: 'integer', provider: 'postgres' })
    ).toEqual([]);
    expect(
      resolveDvtSubstraitFilterCapabilities({ dataType: 'text', provider: 'snowflake' })
    ).toEqual([]);

    const draft = projection();
    expect(
      applyDvtSubstraitFilter(draft, {
        fieldId: 'output:missing',
        dataType: 'text',
        capabilityId: 'unknown',
        value: 'Ada',
      })
    ).toBe(draft);
  });
});
