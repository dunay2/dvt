/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowInputParsingHelpers.ts
 * @ownedConcern Deterministic workflow input primitive parsing
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0003: Execution Model
 * @decision Parse workflow cursor and control values with deterministic validation before execution
 * @consequence Invalid provider payloads fail before mutating canonical DVT lifecycle state
 * @version 1.2.0
 */
export function parseOptionalNonNegativeInt(value: unknown, fieldName: string): number {
  return parseIntegerField({
    value,
    fieldName,
    fallback: 0,
    isAccepted: (numberValue) => numberValue >= 0,
    errorSuffix: 'must_be_non_negative_integer',
  });
}

export function parseRequiredNonNegativeInt(value: unknown, fieldName: string): number {
  return parseIntegerField({
    value,
    fieldName,
    isAccepted: (numberValue) => numberValue >= 0,
    errorSuffix: 'must_be_non_negative_integer',
  });
}

export function parseRequiredPositiveInt(value: unknown, fieldName: string): number {
  return parseIntegerField({
    value,
    fieldName,
    isAccepted: (numberValue) => numberValue > 0,
    errorSuffix: 'must_be_positive_integer',
  });
}

export function parseOptionalStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new TypeError(`INVALID_WORKFLOW_INPUT: ${fieldName}_must_be_string_array`);
  }

  const parsed: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new TypeError(`INVALID_WORKFLOW_INPUT: ${fieldName}_must_be_string_array`);
    }

    const normalized = item.trim();
    if (normalized.length > 0) {
      parsed.push(normalized);
    }
  }

  return parsed;
}

function parseIntegerField(args: {
  value: unknown;
  fieldName: string;
  errorSuffix: string;
  fallback?: number;
  isAccepted(numberValue: number): boolean;
}): number {
  if (args.value === undefined) {
    if (args.fallback !== undefined) {
      return args.fallback;
    }

    throw new TypeError(`INVALID_WORKFLOW_INPUT: ${args.fieldName}_${args.errorSuffix}`);
  }

  const numberValue = coerceIntegerValue(args.value);
  if (numberValue !== undefined && args.isAccepted(numberValue)) {
    return numberValue;
  }

  throw new TypeError(`INVALID_WORKFLOW_INPUT: ${args.fieldName}_${args.errorSuffix}`);
}

function coerceIntegerValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const numberValue = Number(trimmed);
  return Number.isInteger(numberValue) ? numberValue : undefined;
}
