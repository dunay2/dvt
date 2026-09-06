import { Buffer } from 'node:buffer';

import { base64Bytes, sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  DvtSubstraitAuthoringSidecarV1Schema,
  DvtSubstraitSemanticDocumentV1Schema,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  decodeDvtSubstraitPlanV1,
  serializeDvtSubstraitSemanticDocumentV1,
} from '../src/substrait.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

describe('DVT Substrait semantic document decoding', () => {
  it('decodes the pinned typed Plan carried by the canonical document', () => {
    const plan = decodeDvtSubstraitPlanV1(buildDvtSubstraitSemanticDocumentFixture());

    expect(plan.version).toMatchObject({ majorNumber: 0, minorNumber: 101, patchNumber: 0 });
    expect(plan.relations).toHaveLength(1);
  });

  it('rejects corrupted protobuf even when its digest is recomputed', () => {
    const document = buildDvtSubstraitSemanticDocumentFixture();
    const corruptBytes = base64Bytes(document.semanticPlan.bytesBase64);
    corruptBytes[0] = 0xff;
    const corruptSha = sha256Hex(corruptBytes);

    expect(
      DvtSubstraitSemanticDocumentV1Schema.safeParse({
        ...document,
        semanticPlan: {
          ...document.semanticPlan,
          bytesBase64: Buffer.from(corruptBytes).toString('base64'),
          sha256: corruptSha,
        },
        sidecar: { ...document.sidecar, semanticPlanSha256: corruptSha },
      }).success
    ).toBe(false);
  });

  it('preserves stable field identity through deterministic serialization and reload', () => {
    const document = canonicalizeDvtSubstraitSemanticDocumentV1(
      buildDvtSubstraitSemanticDocumentFixture()
    );
    const reversed = {
      ...document,
      sidecar: { ...document.sidecar, fields: [...document.sidecar.fields].reverse() },
    };

    const serialized = serializeDvtSubstraitSemanticDocumentV1(reversed);
    const reloaded = DvtSubstraitSemanticDocumentV1Schema.parse(JSON.parse(serialized));
    expect(reloaded.sidecar.fields.map(({ fieldId }) => fieldId)).toEqual(
      reversed.sidecar.fields.map(({ fieldId }) => fieldId)
    );
    expect(reloaded.semanticPlan).toEqual(document.semanticPlan);
    expect(serializeDvtSubstraitSemanticDocumentV1(reloaded)).toBe(serialized);
  });

  it('keeps RelationId and FieldId stable across rename and physical rebinding', () => {
    const document = buildDvtSubstraitSemanticDocumentFixture();
    const originalRelationIds = document.sidecar.relations.map(({ relationId }) => relationId);
    const originalFieldIds = document.sidecar.fields.map(({ fieldId }) => fieldId);

    const rebound = canonicalizeDvtSubstraitSemanticDocumentV1({
      ...document,
      sidecar: {
        ...document.sidecar,
        relations: document.sidecar.relations.map((relation, index) =>
          index === 0
            ? {
                ...relation,
                displayName: 'customers_renamed',
                sourceRef: {
                  schemaVersion: 'connected-source-ref.v1',
                  connectionRef: {
                    schemaVersion: 'connection-ref.v1',
                    connectionId: 'warehouse-rebound',
                    provider: 'postgres',
                  },
                  sourceObjectId: 'relation/analytics/new_schema/customers_renamed',
                },
              }
            : { ...relation, displayName: 'projection_renamed' }
        ),
        fields: document.sidecar.fields.map((field, index) => ({
          ...field,
          displayName: `renamed_${index}`,
        })),
      },
    });

    expect(rebound.sidecar.relations.map(({ relationId }) => relationId)).toEqual(
      originalRelationIds
    );
    expect(rebound.sidecar.fields.map(({ fieldId }) => fieldId)).toEqual(originalFieldIds);
  });

  it('reorders structural field ordinals without reminting FieldId', () => {
    const document = buildDvtSubstraitSemanticDocumentFixture();
    const originalFieldIds = document.sidecar.fields.map(({ fieldId }) => fieldId);
    const reorderedOrdinals = [2, 0, 1];

    const reordered = DvtSubstraitAuthoringSidecarV1Schema.parse({
      ...document.sidecar,
      fields: document.sidecar.fields.map((field, index) => ({
        ...field,
        outputOrdinal: reorderedOrdinals[index],
      })),
    });

    expect(reordered.fields.map(({ fieldId }) => fieldId)).toEqual(originalFieldIds);
    expect(reordered.fields.map(({ outputOrdinal }) => outputOrdinal)).toEqual(reorderedOrdinals);
  });

  it('rejects duplicate and unbound sidecar identities', () => {
    const document = buildDvtSubstraitSemanticDocumentFixture();
    const [firstField] = document.sidecar.fields;
    if (!firstField) throw new Error('Expected the semantic fixture to contain fields.');

    for (const fields of [
      [firstField, firstField],
      [{ ...firstField, relationId: 'relation:missing' }],
    ]) {
      expect(
        DvtSubstraitAuthoringSidecarV1Schema.safeParse({ ...document.sidecar, fields }).success
      ).toBe(false);
    }
  });

  it('scopes child order to a valid acyclic parent field', () => {
    const document = buildDvtSubstraitSemanticDocumentFixture();
    const [parent, sibling] = document.sidecar.fields;
    if (parent == null || sibling == null) throw new Error('Expected semantic fixture fields.');
    const children = ['given_name', 'family_name'].map((displayName, outputOrdinal) => ({
      fieldId: `field:transform-node:${displayName}`,
      relationId: parent.relationId,
      parentFieldId: parent.fieldId,
      outputOrdinal,
      displayName,
    }));
    const structuredFields = [parent, sibling, ...children];

    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...document.sidecar,
        fields: structuredFields,
      }).success
    ).toBe(true);

    const invalidHierarchies = [
      structuredFields.map((field) =>
        field.fieldId === children[0]?.fieldId
          ? { ...field, parentFieldId: 'field:missing' }
          : field
      ),
      structuredFields.map((field) =>
        field.fieldId === parent.fieldId ? { ...field, parentFieldId: children[0]?.fieldId } : field
      ),
      [
        ...structuredFields,
        {
          ...children[1],
          fieldId: 'field:source-node:cross-relation',
          relationId: document.sidecar.relations[0]?.relationId,
        },
      ],
    ];
    invalidHierarchies.forEach((fields) => {
      expect(
        DvtSubstraitAuthoringSidecarV1Schema.safeParse({ ...document.sidecar, fields }).success
      ).toBe(false);
    });
  });

  it('retains explicit field provenance and rejects an unknown source identity', () => {
    const document = buildDvtSubstraitSemanticDocumentFixture();
    const target = document.sidecar.fields[0];
    const sourceRelationId = document.sidecar.relations[0]?.relationId;
    if (target == null || sourceRelationId == null) throw new Error('Expected semantic fixture.');
    const source = {
      fieldId: 'field:source-node:name',
      relationId: sourceRelationId,
      outputOrdinal: 0,
      displayName: 'name',
    };
    const fields = [source, { ...target, sourceFieldId: source.fieldId }];

    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({ ...document.sidecar, fields }).success
    ).toBe(true);
    expect(
      DvtSubstraitAuthoringSidecarV1Schema.safeParse({
        ...document.sidecar,
        fields: [source, { ...target, sourceFieldId: 'field:missing' }],
      }).success
    ).toBe(false);
  });
});
