import type { Attributes, ObservabilityContext } from '@dvt/observability';

export const TRACE_ATTRIBUTE_KEYS = new Set([
  'action',
  'adapter',
  'http.request.method',
  'http.response.status_code',
  'http.route',
  'method',
  'namespace',
  'operation',
  'outcome',
  'provider',
  'result',
  'route',
  'status',
]);
export const MAX_TRACE_ATTRIBUTE_VALUE_LENGTH = 128;

const STABLE_SPAN_NAME = /^[a-z][A-Za-z0-9_.-]{0,63}$/;
const SAFE_EXCEPTION_TYPE = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const ALLOWED_RESOURCE_ATTRIBUTE_KEYS = new Set([
  'cloud.region',
  'deployment.environment.name',
  'service.namespace',
  'service.version',
]);

export function normalizeSpanName(name: string): string {
  return STABLE_SPAN_NAME.test(name) ? name : 'dvt.invalidSpanName';
}

export function traceContextAttributes(context: ObservabilityContext | undefined): Attributes {
  return context?.adapter === undefined ? {} : { adapter: context.adapter };
}

export function sanitizeTraceAttributes(
  attributes: Attributes
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    const safeValue = sanitizeTraceAttribute(key, value);
    if (safeValue !== undefined) sanitized[key] = safeValue;
  }
  return sanitized;
}

export function sanitizeTraceAttribute(
  key: string,
  value: unknown
): string | number | boolean | undefined {
  if (!TRACE_ATTRIBUTE_KEYS.has(key)) return undefined;
  if (typeof value === 'string') {
    return value.slice(0, MAX_TRACE_ATTRIBUTE_VALUE_LENGTH);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  return undefined;
}

export function resolveExceptionType(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError';
  return SAFE_EXCEPTION_TYPE.test(error.name) ? error.name : 'Error';
}

export function parseResourceAttributes(input: string | undefined): Record<string, string> {
  if (!input) return {};
  const attributes: Record<string, string> = {};
  for (const pair of input.split(',')) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = pair.slice(0, separatorIndex).trim();
    if (!ALLOWED_RESOURCE_ATTRIBUTE_KEYS.has(key)) continue;
    attributes[key] = normalizeResourceValue(pair.slice(separatorIndex + 1).trim());
  }
  return attributes;
}

export function normalizeResourceValue(value: string): string {
  return value.slice(0, MAX_TRACE_ATTRIBUTE_VALUE_LENGTH);
}
