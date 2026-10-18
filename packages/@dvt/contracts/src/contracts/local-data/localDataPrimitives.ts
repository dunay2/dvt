/** Shared validation primitives internal to the LOCAL metadata contracts. */
import { z } from 'zod';

import { isIsoUtcString, isSha256HexString } from '../../utils/contractPrimitives.js';

import { isLocalDataCount } from './localDataInvariants.js';

export const LocalDataCountSchema = z
  .string()
  .refine(
    isLocalDataCount,
    'Expected a canonical uint64 decimal string; JSON numbers are not accepted.'
  );
export const LocalDataPositiveCountSchema = LocalDataCountSchema.refine(
  (value) => value !== '0',
  'Expected a positive row target.'
);
export const LocalDataSha256Schema = z
  .string()
  .refine(isSha256HexString, 'Expected a lowercase SHA-256 hex digest.');
export const LocalDataTimestampSchema = z
  .string()
  .refine(isIsoUtcString, 'Expected a canonical UTC timestamp.');
export const LocalDataLabelSchema = z
  .string()
  .min(1)
  .max(256)
  .refine(
    (value) => value === value.trim() && !value.includes('\0'),
    'Expected bounded, non-blank metadata without exterior whitespace or NUL.'
  );
