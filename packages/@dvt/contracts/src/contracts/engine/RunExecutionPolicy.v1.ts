import { z } from 'zod';

import {
  isNonBlankString,
  isSha256HexString,
  NON_BLANK_STRING_MESSAGE,
  SHA256_HEX_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';

export type { RunExecutionPolicy } from '../../types/contracts.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();
const Sha256HexStringSchema = NonBlankStringSchema.refine((value) => isSha256HexString(value), {
  message: SHA256_HEX_STRING_MESSAGE,
}).brand<'Sha256HexString'>();

export const RunExecutionPolicySchema = z
  .object({
    pluginCompatibilityFingerprint: Sha256HexStringSchema.optional(),
    requiresCapabilities: z.array(NonBlankStringSchema).optional(),
  })
  .strict();
