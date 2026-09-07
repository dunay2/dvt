import { describe, expect, it } from 'vitest';

import {
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type DvtSubstraitSemanticDocumentV1,
  rebindDvtSubstraitSemanticSourceRefV1,
} from '../src/substrait.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

const CURRENT_SOURCE_REF = {
  schemaVersion: 'connected-source-ref.v1' as const,
  connectionRef: {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-current',
    provider: 'postgres' as const,
  },
  sourceObjectId: 'relation/analytics/current/customers',
};

function buildSourceBoundDocument(): DvtSubstraitSemanticDocumentV1 {
  const document = buildDvtSubstraitSemanticDocumentFixture();
  return canonicalizeDvtSubstraitSemanticDocumentV1({
    ...document,
    sidecar: {
      ...document.sidecar,
      relations: document.sidecar.relations.map((relation) =>
        relation.relationId === 'relation:source-node'
          ? { ...relation, sourceRef: CURRENT_SOURCE_REF }
          : relation
      ),
    },
  });
}

describe('DVT Substrait source rebind', () => {
  it('changes only the matching physical sourceRef while preserving logical identity and Plan bytes', () => {
    const document = buildSourceBoundDocument();
    const sourceRelation = document.sidecar.relations.find(
      (relation) => relation.relationId === 'relation:source-node'
    );
    if (sourceRelation?.sourceRef == null) throw new Error('Expected source binding fixture.');
    const relationIds = document.sidecar.relations.map((relation) => relation.relationId);
    const fieldIds = document.sidecar.fields.map((field) => field.fieldId);
    const semanticPlan = document.semanticPlan;
    const nextSourceRef = {
      schemaVersion: 'connected-source-ref.v1' as const,
      connectionRef: {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'warehouse-rebound',
        provider: 'postgres' as const,
      },
      sourceObjectId: 'relation/analytics/rebound/customers',
    };

    const rebound = rebindDvtSubstraitSemanticSourceRefV1(
      document,
      sourceRelation.sourceRef,
      nextSourceRef
    );

    expect(rebound.semanticPlan).toEqual(semanticPlan);
    expect(rebound.sidecar.relations.map((relation) => relation.relationId)).toEqual(relationIds);
    expect(rebound.sidecar.fields.map((field) => field.fieldId)).toEqual(fieldIds);
    expect(
      rebound.sidecar.relations.find(
        (relation) => relation.relationId === sourceRelation.relationId
      )?.sourceRef
    ).toEqual(nextSourceRef);
  });

  it('does not treat a non-matching physical binding as a logical alias', () => {
    const document = buildSourceBoundDocument();
    const rebound = rebindDvtSubstraitSemanticSourceRefV1(
      document,
      {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'missing-binding',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/missing/public/orders',
      },
      {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'other-binding',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/other/public/orders',
      }
    );

    expect(rebound).toEqual(document);
  });
});
