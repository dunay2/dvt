/**
 * Owned concern: validate a provider-neutral step artifact reference.
 * @baseline ADR-0018: Cross-package serializable shapes belong to contracts.
 * @decision Own artifact identity independently of any execution plugin.
 * @consequence SQL and event artifacts do not import DBT configuration.
 * @version 1.0.0
 */
import { z } from 'zod';

const HexSha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const StepArtifactRefSchema = z
  .object({
    artifactKind: z.string().min(1),
    sha256: HexSha256Schema,
    storageUri: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    encoding: z.literal('utf-8').optional(),
  })
  .strict();
