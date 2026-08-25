import { describe, expect, it } from 'vitest';

import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_ID,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_PROFILE_SCHEMA_VERSION,
  DVT_SUBSTRAIT_PROTOBUF_TOOLCHAIN,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  DVT_SUBSTRAIT_SPEC_COMMIT_SHA,
  DVT_SUBSTRAIT_SPEC_VERSION,
  DVT_SUBSTRAIT_VTX2_PROFILE,
  DvtSubstraitAuthoringSidecarV1Schema,
  DvtSubstraitSemanticDocumentV1Schema,
  DvtSubstraitSemanticPlanV1Schema,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  evaluateDvtSubstraitProfileCompatibility,
  serializeDvtSubstraitSemanticDocumentV1,
} from '../src/substrait.js';

const PLAN_BASE64 =
  'MkQQZSIoMjY1M2U1NTUxNmM4YzA3NTI5Y2RlOWJjODFjNjRlNGFlMzUzNzUxNSoWZHZ0LXZ0eDItY29udHJhY3QtdGVzdFICCAE=';
const PLAN_SHA256 = '14b79e6263d90848e17e90613d5e5bf2dacdbd08eb6508847b197e7351342ecc';

const SOURCE_REF = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-main',
    provider: 'postgres',
  },
  sourceObjectId: 'relation/analytics/public/orders',
} as const;

const SEMANTIC_DOCUMENT = {
  schemaVersion: 'dvt-substrait-semantic-document.v1',
  profile: {
    schemaVersion: 'dvt-substrait-profile.v1',
    profileId: 'dvt.vtx2.substrait.v1',
    specVersion: '0.101.0',
    specCommitSha: '2653e55516c8c07529cde9bc81c64e4ae3537515',
  },
  semanticPlan: {
    encoding: 'substrait-plan-protobuf-base64',
    bytesBase64: PLAN_BASE64,
    sha256: PLAN_SHA256,
  },
  sidecar: {
    schemaVersion: 'dvt-substrait-authoring-sidecar.v1',
    semanticPlanSha256: PLAN_SHA256,
    relations: [
      {
        relationId: 'rel-orders',
        relAnchor: 1,
        sourceRef: SOURCE_REF,
        displayName: 'orders',
      },
      {
        relationId: 'rel-result',
        relAnchor: 2,
        displayName: 'orders_result',
      },
    ],
    fields: [
      {
        fieldId: 'field-order-id',
        relationId: 'rel-result',
        outputOrdinal: 0,
        displayName: 'order_id',
      },
      {
        fieldId: 'field-customer-name',
        relationId: 'rel-result',
        outputOrdinal: 1,
        displayName: 'customer_name',
      },
    ],
  },
} as const;

describe('DVT Substrait VTX2 profile', () => {
  it('pins one exact upstream semantic/profile and protobuf tool boundary', () => {
    expect(DVT_SUBSTRAIT_PROFILE_SCHEMA_VERSION).toBe('dvt-substrait-profile.v1');
    expect(DVT_SUBSTRAIT_PROFILE_ID).toBe('dvt.vtx2.substrait.v1');
    expect(DVT_SUBSTRAIT_SPEC_VERSION).toBe('0.101.0');
    expect(DVT_SUBSTRAIT_SPEC_COMMIT_SHA).toBe('2653e55516c8c07529cde9bc81c64e4ae3537515');
    expect(DVT_SUBSTRAIT_PROTOBUF_TOOLCHAIN).toEqual({
      runtime: '@bufbuild/protobuf@2.14.0',
      generator: '@bufbuild/protoc-gen-es@2.14.0',
      buf: '@bufbuild/buf@1.72.0',
    });
    expect(DVT_SUBSTRAIT_VTX2_PROFILE).toEqual({
      schemaVersion: 'dvt-substrait-profile.v1',
      profileId: 'dvt.vtx2.substrait.v1',
      spec: {
        version: '0.101.0',
        tag: 'v0.101.0',
        commitSha: '2653e55516c8c07529cde9bc81c64e4ae3537515',
        planProto: 'proto/substrait/plan.proto',
      },
      protobufToolchain: DVT_SUBSTRAIT_PROTOBUF_TOOLCHAIN,
    });
    expect(Object.keys(DVT_SUBSTRAIT_VTX2_PROFILE)).not.toContain('logicalRelations');
    expect(Object.keys(DVT_SUBSTRAIT_VTX2_PROFILE)).not.toContain('expressionFamilies');
  });

  it('reports version skew as an explicit compatibility mismatch', () => {
    expect(evaluateDvtSubstraitProfileCompatibility(DVT_SUBSTRAIT_PROFILE_REF_V1)).toEqual({
      status: 'compatible',
    });
    expect(
      evaluateDvtSubstraitProfileCompatibility({
        ...DVT_SUBSTRAIT_PROFILE_REF_V1,
        specVersion: '0.102.0',
      })
    ).toEqual({ status: 'incompatible', reason: 'spec-version-mismatch' });
    expect(
      evaluateDvtSubstraitProfileCompatibility({
        ...DVT_SUBSTRAIT_PROFILE_REF_V1,
        specCommitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      })
    ).toEqual({ status: 'incompatible', reason: 'spec-commit-mismatch' });
    expect(evaluateDvtSubstraitProfileCompatibility({ profileId: 'old' })).toEqual({
      status: 'incompatible',
      reason: 'malformed-profile-ref',
    });
  });
});

describe('DVT Substrait semantic document and authoring sidecar', () => {
  it('accepts one exact semantic Plan envelope plus identity-only bindings', () => {
    expect(DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION).toBe(
      'dvt-substrait-semantic-document.v1'
    );
    expect(DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION).toBe(
      'dvt-substrait-authoring-sidecar.v1'
    );
    expect(DVT_SUBSTRAIT_PLAN_ENCODING).toBe('substrait-plan-protobuf-base64');
    expect(DvtSubstraitSemanticDocumentV1Schema.parse(SEMANTIC_DOCUMENT)).toEqual(
      SEMANTIC_DOCUMENT
    );
  });

  it('verifies the declared SHA-256 against the actual serialized Plan bytes', () => {
    expect(DvtSubstraitSemanticPlanV1Schema.parse(SEMANTIC_DOCUMENT.semanticPlan)).toEqual(
      SEMANTIC_DOCUMENT.semanticPlan
    );
    expect(
      DvtSubstraitSemanticPlanV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT.semanticPlan,
        bytesBase64: 'AAAA',
      }).success
    ).toBe(false);
  });

  it('serializes deterministically in contract key order', () => {
    const first = serializeDvtSubstraitSemanticDocumentV1(SEMANTIC_DOCUMENT);
    const second = serializeDvtSubstraitSemanticDocumentV1({
      sidecar: SEMANTIC_DOCUMENT.sidecar,
      semanticPlan: SEMANTIC_DOCUMENT.semanticPlan,
      profile: SEMANTIC_DOCUMENT.profile,
      schemaVersion: SEMANTIC_DOCUMENT.schemaVersion,
    });

    expect(first).toBe(second);
    expect(JSON.parse(first)).toEqual(SEMANTIC_DOCUMENT);
  });

  it('preserves FieldId through rename, reorder, and full serialization reload', () => {
    const original = canonicalizeDvtSubstraitSemanticDocumentV1(SEMANTIC_DOCUMENT);
    const firstField = original.sidecar.fields[0];
    const secondField = original.sidecar.fields[1];
    if (!firstField || !secondField) {
      throw new Error('Expected the identity fixture fields.');
    }

    const edited = {
      ...original,
      sidecar: {
        ...original.sidecar,
        fields: [
          { ...firstField, outputOrdinal: 1 },
          { ...secondField, outputOrdinal: 0, displayName: 'display_name' },
        ],
      },
    };
    const reloaded = JSON.parse(
      serializeDvtSubstraitSemanticDocumentV1(edited)
    ) as typeof SEMANTIC_DOCUMENT;

    expect(reloaded.sidecar.fields.map((field) => field.fieldId).sort()).toEqual([
      'field-customer-name',
      'field-order-id',
    ]);
    expect(
      reloaded.sidecar.fields.find((field) => field.fieldId === 'field-customer-name')
    ).toMatchObject({
      fieldId: 'field-customer-name',
      outputOrdinal: 0,
      displayName: 'display_name',
    });
    expect(reloaded.sidecar.semanticPlanSha256).toBe(PLAN_SHA256);
    expect(reloaded.semanticPlan.sha256).toBe(PLAN_SHA256);
  });

  it('rejects duplicate ids/anchors/positions and references to unknown relations', () => {
    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT.sidecar,
        relations: [
          SEMANTIC_DOCUMENT.sidecar.relations[0],
          { ...SEMANTIC_DOCUMENT.sidecar.relations[1], relationId: 'rel-orders' },
        ],
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT.sidecar,
        relations: [
          SEMANTIC_DOCUMENT.sidecar.relations[0],
          { ...SEMANTIC_DOCUMENT.sidecar.relations[1], relAnchor: 1 },
        ],
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT.sidecar,
        fields: [
          SEMANTIC_DOCUMENT.sidecar.fields[0],
          { ...SEMANTIC_DOCUMENT.sidecar.fields[1], fieldId: 'field-order-id' },
        ],
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT.sidecar,
        fields: [
          SEMANTIC_DOCUMENT.sidecar.fields[0],
          { ...SEMANTIC_DOCUMENT.sidecar.fields[1], outputOrdinal: 0 },
        ],
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT.sidecar,
        fields: [{ ...SEMANTIC_DOCUMENT.sidecar.fields[0], relationId: 'rel-missing' }],
      }).success
    ).toBe(false);
  });

  it('binds the sidecar to the exact semantic Plan digest and rejects semantic duplication', () => {
    expect(
      DvtSubstraitSemanticDocumentV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT,
        sidecar: {
          ...SEMANTIC_DOCUMENT.sidecar,
          semanticPlanSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      }).success
    ).toBe(false);

    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT.sidecar,
        join: { type: 'inner' },
      }).success
    ).toBe(false);
    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...SEMANTIC_DOCUMENT.sidecar,
        aggregate: { measures: ['sum'] },
      }).success
    ).toBe(false);
  });
});
