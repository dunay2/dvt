/**
 * Owned concern: validate the canonical DVT Substrait semantic document and
 * stable identity/provenance sidecar.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Bind exact pinned Plan bytes to one identity-only DVT sidecar.
 * @version 1.0.0
 */
import { base64Bytes, jcsCanonicalize, sha256Hex } from '@dvt/crypto';
import { z } from 'zod';

import {
  ConnectedSourceRefSchema,
  type ConnectedSourceRef,
} from '../source-import/ConnectedSourceRef.v1.js';

import { validateDvtSubstraitFieldHierarchyV1 } from './DvtSubstraitFieldBindingHierarchy.v1.js';
import { decodeDvtSubstraitPlanV1 } from './DvtSubstraitPlanBinary.v1.js';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  DvtSubstraitProfileRefV1Schema,
} from './DvtSubstraitProfile.v1.js';

const NonBlankStringSchema = z
  .string()
  .refine(
    (value) => value.length > 0 && value === value.trim(),
    'Expected a non-blank string without exterior whitespace.'
  );
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/, 'Expected a lowercase SHA-256 hex digest.');
const Base64Schema = z
  .string()
  .min(4)
  .regex(
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    'Expected canonical base64 without whitespace.'
  );

export const DvtSubstraitSemanticPlanV1Schema = z
  .object({
    encoding: z.literal(DVT_SUBSTRAIT_PLAN_ENCODING),
    bytesBase64: Base64Schema,
    sha256: Sha256Schema,
  })
  .strict()
  .superRefine((plan, context) => {
    if (sha256Hex(base64Bytes(plan.bytesBase64)) !== plan.sha256) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic Plan SHA-256 does not match the serialized Substrait bytes.',
        path: ['sha256'],
      });
    }
  });

export const DvtSubstraitRelationBindingV1Schema = z
  .object({
    relationId: NonBlankStringSchema,
    relAnchor: z.number().int().positive().max(0xffffffff),
    sourceRef: ConnectedSourceRefSchema.optional(),
    displayName: NonBlankStringSchema.optional(),
  })
  .strict();

export const DvtSubstraitFieldBindingV1Schema = z
  .object({
    fieldId: NonBlankStringSchema,
    relationId: NonBlankStringSchema,
    parentFieldId: NonBlankStringSchema.optional(),
    sourceFieldId: NonBlankStringSchema.optional(),
    outputOrdinal: z.number().int().nonnegative(),
    displayName: NonBlankStringSchema.optional(),
    description: NonBlankStringSchema.optional(),
  })
  .strict();

export const DvtSubstraitAuthoringSidecarV1Schema = z
  .object({
    schemaVersion: z.literal(DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION),
    semanticPlanSha256: Sha256Schema,
    relations: z.array(DvtSubstraitRelationBindingV1Schema).min(1),
    fields: z.array(DvtSubstraitFieldBindingV1Schema),
  })
  .strict()
  .superRefine((sidecar, context) => {
    const relationIds = new Set<string>();
    const relAnchors = new Set<number>();
    sidecar.relations.forEach((relation, index) => {
      if (relationIds.has(relation.relationId)) {
        context.addIssue({
          code: 'custom',
          message: 'Duplicate relationId.',
          path: ['relations', index, 'relationId'],
        });
      }
      if (relAnchors.has(relation.relAnchor)) {
        context.addIssue({
          code: 'custom',
          message: 'Duplicate rel_anchor.',
          path: ['relations', index, 'relAnchor'],
        });
      }
      relationIds.add(relation.relationId);
      relAnchors.add(relation.relAnchor);
    });

    validateDvtSubstraitFieldHierarchyV1(sidecar.fields, relationIds).forEach((issue) => {
      context.addIssue({
        code: 'custom',
        message: issue.message,
        path: ['fields', issue.index, issue.property],
      });
    });
  });

export const DvtSubstraitSemanticDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION),
    profile: DvtSubstraitProfileRefV1Schema,
    semanticPlan: DvtSubstraitSemanticPlanV1Schema,
    sidecar: DvtSubstraitAuthoringSidecarV1Schema,
  })
  .strict()
  .superRefine((document, context) => {
    if (document.sidecar.semanticPlanSha256 !== document.semanticPlan.sha256) {
      context.addIssue({
        code: 'custom',
        message: 'Authoring sidecar is bound to a different semantic Plan digest.',
        path: ['sidecar', 'semanticPlanSha256'],
      });
    }
    try {
      decodeDvtSubstraitPlanV1(document);
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'Semantic Plan bytes do not decode under the pinned DVT profile.',
        path: ['semanticPlan', 'bytesBase64'],
      });
    }
  });

export type DvtSubstraitSemanticPlanV1 = z.infer<typeof DvtSubstraitSemanticPlanV1Schema>;
export type DvtSubstraitRelationBindingV1 = z.infer<typeof DvtSubstraitRelationBindingV1Schema>;
export type DvtSubstraitFieldBindingV1 = z.infer<typeof DvtSubstraitFieldBindingV1Schema>;
export type DvtSubstraitAuthoringSidecarV1 = z.infer<typeof DvtSubstraitAuthoringSidecarV1Schema>;
export type DvtSubstraitSemanticDocumentV1 = z.infer<typeof DvtSubstraitSemanticDocumentV1Schema>;

export function canonicalizeDvtSubstraitSemanticDocumentV1(
  input: unknown
): DvtSubstraitSemanticDocumentV1 {
  return DvtSubstraitSemanticDocumentV1Schema.parse(input);
}

export function serializeDvtSubstraitSemanticDocumentV1(input: unknown): string {
  return JSON.stringify(canonicalizeDvtSubstraitSemanticDocumentV1(input));
}

export function rebindDvtSubstraitSemanticSourceRefV1(
  input: unknown,
  currentSourceRef: ConnectedSourceRef,
  nextSourceRef: ConnectedSourceRef
): DvtSubstraitSemanticDocumentV1 {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  const current = ConnectedSourceRefSchema.parse(currentSourceRef);
  const next = ConnectedSourceRefSchema.parse(nextSourceRef);
  const currentKey = jcsCanonicalize(current);
  if (
    !document.sidecar.relations.some(
      (relation) =>
        relation.sourceRef != null && jcsCanonicalize(relation.sourceRef) === currentKey
    )
  ) {
    return document;
  }
  return canonicalizeDvtSubstraitSemanticDocumentV1({
    ...document,
    sidecar: {
      ...document.sidecar,
      relations: document.sidecar.relations.map((relation) =>
        relation.sourceRef != null && jcsCanonicalize(relation.sourceRef) === currentKey
          ? { ...relation, sourceRef: next }
          : relation
      ),
    },
  });
}
