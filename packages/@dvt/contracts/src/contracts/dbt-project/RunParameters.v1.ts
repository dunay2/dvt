/**
 * Owned concern: version the bounded, non-secret inputs declared by a dbt model.
 * @baseline ADR-0071: an operator chooses scalar data within the authored model's domain.
 */
import { z } from 'zod';

const safeKey = (key: string): boolean =>
  !Object.hasOwn(Object.prototype, key) && key !== 'prototype';
const variableName = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/u)
  .refine(safeKey)
  .refine(
    (key) =>
      !/(?:password|secret|credential|access_token|private_key|connection_string)/iu.test(key)
  );
const textChoice = z.string().regex(/^[A-Za-z0-9_]{1,80}$/u);
const scalar = z.union([z.boolean(), z.number().int(), textChoice, z.iso.date()]);
export type RunParameterScalar = z.infer<typeof scalar>;

const definition = z
  .object({
    name: variableName,
    type: z.enum(['integer', 'boolean', 'text', 'date']),
    defaultValue: scalar.optional(),
    projectDefault: scalar.optional(),
    environmentDefaults: z
      .record(z.string().min(1).max(128).refine(safeKey), scalar)
      .refine((values) => Object.keys(values).length <= 64)
      .optional(),
    enabledBy: variableName.optional(),
    enabledByDefault: z.boolean().optional(),
    choices: z.array(textChoice).min(1).max(64).optional(),
  })
  .strict();
export type RunParameterDefinition = z.infer<typeof definition>;

export function acceptsRunParameterValue(
  parameter: RunParameterDefinition,
  value: RunParameterScalar
): boolean {
  switch (parameter.type) {
    case 'integer':
      return Number.isSafeInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return z.iso.date().safeParse(value).success;
    case 'text':
      return typeof value === 'string' && parameter.choices?.includes(value) === true;
  }
}

export const RunParameterDefinitionSchema = definition.superRefine((entry, ctx) => {
  if (
    (entry.type === 'text') !== (entry.choices !== undefined) ||
    (entry.choices && new Set(entry.choices).size !== entry.choices.length)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['choices'],
      message: 'Text parameters require distinct choices.',
    });
  }
  if (
    (entry.enabledByDefault !== undefined && !entry.enabledBy) ||
    entry.enabledBy === entry.name
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['enabledBy'],
      message: 'An optional condition needs its own flag.',
    });
  }
  const defaults = [
    entry.defaultValue,
    entry.projectDefault,
    ...Object.values(entry.environmentDefaults ?? {}),
  ];
  if (defaults.some((value) => value !== undefined && !acceptsRunParameterValue(entry, value))) {
    ctx.addIssue({
      code: 'custom',
      message: 'A parameter default is outside its declared domain.',
    });
  }
});

export const RunParameterDefinitionsSchema = z
  .array(RunParameterDefinitionSchema)
  .min(1)
  .max(32)
  .refine((entries) => {
    const names = entries.flatMap(({ name, enabledBy }) =>
      enabledBy ? [name, enabledBy] : [name]
    );
    return new Set(names).size === names.length;
  }, 'Duplicate parameter or enable flag.');

const override = z
  .object({ name: variableName, enabled: z.boolean().optional(), value: scalar.optional() })
  .strict()
  .refine((input) => input.enabled !== undefined || input.value !== undefined);
export type RunParameterOverride = z.infer<typeof override>;
export const RunParameterOverridesSchema = z
  .array(override)
  .max(32)
  .refine((entries) => new Set(entries.map(({ name }) => name)).size === entries.length);

export const DbtRunVariablesSchema = z.record(variableName, scalar).refine((values) => {
  const count = Object.keys(values).length;
  return count > 0 && count <= 64;
});
export const DbtVariablesJsonSchema = z
  .string()
  .min(2)
  .max(16_384)
  .refine((json) => {
    try {
      return DbtRunVariablesSchema.safeParse(JSON.parse(json)).success;
    } catch {
      return false;
    }
  }, 'Invalid dbt run variables.');
