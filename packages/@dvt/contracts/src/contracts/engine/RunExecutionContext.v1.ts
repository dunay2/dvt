import { z } from 'zod';

import {
  isIsoUtcString,
  isNonBlankString,
  NON_BLANK_STRING_MESSAGE,
  STRICT_ISO_UTC_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();
const IsoUtcStringSchema = NonBlankStringSchema.refine((value) => isIsoUtcString(value), {
  message: STRICT_ISO_UTC_STRING_MESSAGE,
}).brand<'IsoUtcString'>();

const ProviderSchema = z.enum(['temporal', 'conductor', 'mock']);

export const RunExecutionContextRefSchema = z
  .object({
    uri: NonBlankStringSchema,
    sha256: NonBlankStringSchema,
    schemaVersion: NonBlankStringSchema,
    planId: NonBlankStringSchema,
    planVersion: NonBlankStringSchema,
    pluginCompatibilityFingerprint: NonBlankStringSchema.optional(),
  })
  .strict();

export const RunExecutionContextSchema = z
  .object({
    schemaVersion: NonBlankStringSchema,
    planId: NonBlankStringSchema,
    planVersion: NonBlankStringSchema,
    planSha256: NonBlankStringSchema,
    pluginCompatibilityFingerprint: NonBlankStringSchema.optional(),
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
    targetAdapter: ProviderSchema,
    createdAtIso: IsoUtcStringSchema,
    createdBy: NonBlankStringSchema,
    pluginContexts: z.record(
      z.string().min(1),
      z
        .record(z.string().min(1), NonBlankStringSchema)
        .refine(
          (ctx) => Object.keys(ctx).length > 0,
          'Plugin context must include at least one key'
        )
    ),
  })
  .strict();
