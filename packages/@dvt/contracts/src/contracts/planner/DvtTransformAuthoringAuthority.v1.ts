/**
 * Owned concern: admit the single canonical authoring authority for DVT transforms.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Admit Substrait as the sole DVT transform authoring authority.
 * @version 1.0.0
 */
import { z } from 'zod';

import { DvtSubstraitSemanticDocumentV1Schema } from './DvtSubstraitSemanticDocument.v1.js';

export const DVT_TRANSFORM_AUTHORING_AUTHORITY_VERSION = 'v1' as const;
export const DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY = 'transformAuthoring' as const;
export const DVT_TRANSFORM_AUTHORING_MODE = {
  substrait: 'substrait',
} as const;

export const DvtTransformAuthoringAuthorityV1Schema = z
  .object({
    version: z.literal(DVT_TRANSFORM_AUTHORING_AUTHORITY_VERSION),
    mode: z.literal(DVT_TRANSFORM_AUTHORING_MODE.substrait),
    semanticDocument: DvtSubstraitSemanticDocumentV1Schema,
  })
  .strict();

export type DvtTransformAuthoringAuthorityV1 = z.infer<
  typeof DvtTransformAuthoringAuthorityV1Schema
>;
