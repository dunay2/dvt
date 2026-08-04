/** Owned concern: bind a DBT execution step to its project resource selector. */
import { z } from 'zod';

export const DBT_STEP_SELECTOR_CUSTOM_KEY = 'dbtStepSelector' as const;

const DbtSelectorSchema = z
  .string()
  .min(1)
  .max(512)
  .refine((value) => value === value.trim() && !containsControlCharacter(value));

export const DbtStepSelectorSchema = z
  .object({
    version: z.literal('v1'),
    selector: DbtSelectorSchema,
  })
  .strict();

export type DbtStepSelector = z.infer<typeof DbtStepSelectorSchema>;

export type DbtStepSelectorResolution =
  | Readonly<{ status: 'absent' }>
  | Readonly<{ status: 'valid'; target: DbtStepSelector }>
  | Readonly<{ status: 'invalid' }>;

export function resolveDbtStepSelector(stepTypeConfig: unknown): DbtStepSelectorResolution {
  if (!isRecord(stepTypeConfig)) return { status: 'absent' };
  const custom = stepTypeConfig['custom'];
  if (!isRecord(custom) || !(DBT_STEP_SELECTOR_CUSTOM_KEY in custom)) {
    return { status: 'absent' };
  }

  const parsed = DbtStepSelectorSchema.safeParse(custom[DBT_STEP_SELECTOR_CUSTOM_KEY]);
  return parsed.success ? { status: 'valid', target: parsed.data } : { status: 'invalid' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint != null && (codePoint <= 31 || codePoint === 127);
  });
}
