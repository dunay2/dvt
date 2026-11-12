/**
 * Owned concern: project trusted Chromium net-log into credential-free correlation evidence.
 * Why: a finite rejection branch diagnoses refusal without exposing private capture text.
 * Corner: existing acceptance predicates stay strict; raw-file cleanup belongs to the lifecycle.
 */
import {
  findNodeAtLocation,
  getNodeValue,
  parseTree,
  printParseErrorCode,
  type Node as JsonNode,
  type ParseError,
} from 'jsonc-parser';

export const captureSyntaxReasons = Object.freeze([
  'rootMissing',
  'eventsNotArray',
  'constantsNotObject',
  'constantsNotClosed',
  'eventNotObject',
  'eventNotClosed',
  'interiorSyntaxError',
  'unsupportedEofError',
  'lastEventMissing',
  'suffixNotAdmitted',
] as const);
export type CaptureSyntaxReason = (typeof captureSyntaxReasons)[number];

export class ChromiumProjectionError extends Error {
  constructor(reason: 'captureSyntax' | 'logShape' | 'eventShape');
  constructor(reason: 'captureSyntax', syntaxReason: CaptureSyntaxReason);
  constructor(
    readonly reason: 'captureSyntax' | 'logShape' | 'eventShape',
    readonly syntaxReason?: CaptureSyntaxReason
  ) {
    super(
      reason === 'captureSyntax'
        ? 'Invalid Chromium network capture'
        : 'Invalid Chromium network log'
    );
  }
}

type NetworkEvent = Readonly<{
  kind: string;
  sourceId: number;
  dependencySourceId?: number;
  time?: string;
  phase?: number;
  netError?: number;
  statusCode?: number;
  method?: string;
  origin?: string;
  route?: string;
}>;

type ProcessLogLocation = Readonly<{ processId: number; threadId: number; time: string }>;

// Chromium M155 validation_errors.cc; NONE is not failure evidence.
const validationErrorCodes = [
  'VALIDATION_ERROR_MISALIGNED_OBJECT',
  'VALIDATION_ERROR_ILLEGAL_MEMORY_RANGE',
  'VALIDATION_ERROR_UNEXPECTED_STRUCT_HEADER',
  'VALIDATION_ERROR_UNEXPECTED_ARRAY_HEADER',
  'VALIDATION_ERROR_ILLEGAL_HANDLE',
  'VALIDATION_ERROR_UNEXPECTED_INVALID_HANDLE',
  'VALIDATION_ERROR_ILLEGAL_POINTER',
  'VALIDATION_ERROR_UNEXPECTED_NULL_POINTER',
  'VALIDATION_ERROR_ILLEGAL_INTERFACE_ID',
  'VALIDATION_ERROR_UNEXPECTED_INVALID_INTERFACE_ID',
  'VALIDATION_ERROR_MESSAGE_HEADER_INVALID_FLAGS',
  'VALIDATION_ERROR_MESSAGE_HEADER_MISSING_REQUEST_ID',
  'VALIDATION_ERROR_MESSAGE_HEADER_UNKNOWN_METHOD',
  'VALIDATION_ERROR_DIFFERENT_SIZED_ARRAYS_IN_MAP',
  'VALIDATION_ERROR_UNKNOWN_UNION_TAG',
  'VALIDATION_ERROR_UNKNOWN_ENUM_VALUE',
  'VALIDATION_ERROR_DESERIALIZATION_FAILED',
  'VALIDATION_ERROR_MAX_RECURSION_DEPTH',
] as const;
type ValidationError = ProcessLogLocation &
  Readonly<{ code: (typeof validationErrorCodes)[number] }>;

export function projectChromiumProcessLog(text: string | undefined):
  | Readonly<{ state: 'unavailable' }>
  | Readonly<{
      state: 'observed';
      networkServiceRestarts: readonly ProcessLogLocation[];
      validationErrors: readonly ValidationError[];
    }> {
  if (text === undefined) return { state: 'unavailable' };
  const networkServiceRestarts: ProcessLogLocation[] = [];
  const validationErrors: ValidationError[] = [];
  for (const line of text.split(/\r?\n/u)) {
    const match =
      /^\[(\d+):(\d+):(\d{4}\/\d{6}\.\d{6}):ERROR:([A-Za-z0-9_./\\-]+\.cc)(?::\d+|\(\d+\))\] (.*)$/u.exec(
        line
      );
    if (
      match === null ||
      typeof match[3] !== 'string' ||
      typeof match[4] !== 'string' ||
      typeof match[5] !== 'string' ||
      !Number.isSafeInteger(Number(match[1])) ||
      !Number.isSafeInteger(Number(match[2])) ||
      Number(match[1]) <= 0 ||
      Number(match[2]) <= 0
    )
      continue;
    const location = { processId: Number(match[1]), threadId: Number(match[2]), time: match[3] };
    const source = match[4].replace(/\\/gu, '/');
    if (
      /^(?:[A-Za-z0-9_./-]*\/)?network_service_instance_impl\.cc$/u.test(source) &&
      match[5] === 'Network service crashed or was terminated, restarting service.'
    ) {
      networkServiceRestarts.push(location);
    } else if (
      source === 'validation_errors.cc' ||
      source === 'mojo/public/cpp/bindings/lib/validation_errors.cc'
    ) {
      const validation = /^Invalid message: (VALIDATION_ERROR_[A-Z_]+)(?: \([^\r\n]*\))?$/u.exec(
        match[5]
      );
      const code = validationErrorCodes.find((candidate) => candidate === validation?.[1]);
      if (code !== undefined) validationErrors.push({ ...location, code });
    }
  }
  return { state: 'observed', networkServiceRestarts, validationErrors };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeRoute(value: unknown): Readonly<{ origin: string; route: string }> | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    )
      return null;
    const exact = [
      '/session',
      '/capabilities',
      '/healthz',
      '/workspace/context',
      '/workspace/graph/draft',
    ];
    const compiledCss = /^\/assets\/(?:index|Canvas|RunsView)-[A-Za-z0-9_-]{8}\.css$/u.test(
      url.pathname
    );
    const route =
      exact.includes(url.pathname) || compiledCss
        ? url.pathname
        : url.pathname.startsWith('/workspace/files/')
          ? '/workspace/files/:path'
          : url.pathname.startsWith('/workspace/dbt/')
            ? '/workspace/dbt/:operation'
            : '/other';
    return { origin: url.origin, route };
  } catch {
    return null;
  }
}

function readResponseStatus(kind: string, headers: unknown): number | undefined {
  if (
    kind !== 'HTTP_TRANSACTION_READ_RESPONSE_HEADERS' ||
    !Array.isArray(headers) ||
    typeof headers[0] !== 'string'
  )
    return;
  const status = /^HTTP\/(?:1\.[01]|2|3) ([1-5]\d{2})(?: |$)/u.exec(headers[0]);
  return status ? Number(status[1]) : undefined;
}

export function projectChromiumNetworkLog(
  value: unknown
): Readonly<{ schemaVersion: 1; events: readonly NetworkEvent[]; timeTickOffset?: string }> {
  const input = record(value);
  const constants = record(input?.constants);
  const kinds = record(constants?.logEventTypes);
  if (kinds === null || !Array.isArray(input?.events) || input.events.length === 0)
    throw new ChromiumProjectionError('logShape');
  const names = new Map(
    Object.entries(kinds).flatMap(([kind, code]) =>
      typeof code === 'number' &&
      Number.isSafeInteger(code) &&
      /^(CORS_|URL_REQUEST_|HTTP_TRANSACTION_|HTTP_STREAM_|CONNECT_JOB_|TRANSPORT_CONNECT_JOB_|SOCKET_|TCP_CONNECT|SSL_CONNECT)[A-Z0-9_]*$/u.test(
        kind
      )
        ? [[code, kind] as const]
        : []
    )
  );
  const events: NetworkEvent[] = [];
  for (const entry of input.events) {
    const event = record(entry);
    const source = record(event?.source);
    if (
      event === null ||
      typeof event.type !== 'number' ||
      typeof source?.id !== 'number' ||
      !Number.isSafeInteger(source.id)
    )
      throw new ChromiumProjectionError('eventShape');
    const kind = names.get(event.type);
    if (kind === undefined) continue;
    const params = record(event.params);
    const method =
      typeof params?.method === 'string' &&
      /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/u.test(params.method)
        ? params.method
        : undefined;
    const route = safeRoute(params?.url);
    const statusCode = readResponseStatus(kind, params?.headers);
    const dependency = record(params?.source_dependency)?.id;
    events.push({
      kind,
      sourceId: source.id,
      ...(typeof dependency === 'number' && Number.isSafeInteger(dependency) && dependency >= 0
        ? { dependencySourceId: dependency }
        : {}),
      ...(typeof event.time === 'string' && /^\d+(?:\.\d+)?$/u.test(event.time)
        ? { time: event.time }
        : {}),
      ...(typeof event.phase === 'number' && Number.isSafeInteger(event.phase)
        ? { phase: event.phase }
        : {}),
      ...(typeof params?.net_error === 'number' && Number.isSafeInteger(params.net_error)
        ? { netError: params.net_error }
        : {}),
      ...(method === undefined ? {} : { method }),
      ...(statusCode === undefined ? {} : { statusCode }),
      ...(route ?? {}),
    });
  }
  const offset = constants?.timeTickOffset;
  const timeTickOffset =
    typeof offset === 'number' && Number.isSafeInteger(offset) ? String(offset) : offset;
  return {
    schemaVersion: 1,
    events,
    ...(typeof timeTickOffset === 'string' && /^-?\d+$/u.test(timeTickOffset)
      ? { timeTickOffset }
      : {}),
  };
}

function assertCaptureSyntax(
  text: string,
  root: JsonNode | undefined,
  errors: readonly ParseError[]
): asserts root is JsonNode {
  if (root === undefined) throw new ChromiumProjectionError('captureSyntax', 'rootMissing');
  const events = findNodeAtLocation(root, ['events']);
  const constants = findNodeAtLocation(root, ['constants']);
  if (events?.type !== 'array')
    throw new ChromiumProjectionError('captureSyntax', 'eventsNotArray');
  if (constants?.type !== 'object')
    throw new ChromiumProjectionError('captureSyntax', 'constantsNotObject');
  const closedObject = (node: JsonNode): boolean => text[node.offset + node.length - 1] === '}';
  if (!closedObject(constants))
    throw new ChromiumProjectionError('captureSyntax', 'constantsNotClosed');
  const invalidEvent = events.children?.find(
    (event) => event.type !== 'object' || !closedObject(event)
  );
  if (invalidEvent !== undefined) {
    throw new ChromiumProjectionError(
      'captureSyntax',
      invalidEvent.type !== 'object' ? 'eventNotObject' : 'eventNotClosed'
    );
  }
  const invalidError = errors.find(
    (error) =>
      error.offset !== text.length ||
      !['CloseBraceExpected', 'CloseBracketExpected', 'ValueExpected'].includes(
        printParseErrorCode(error.error)
      )
  );
  if (invalidError !== undefined) {
    throw new ChromiumProjectionError(
      'captureSyntax',
      invalidError.offset !== text.length ? 'interiorSyntaxError' : 'unsupportedEofError'
    );
  }
  if (errors.length === 0) return;
  const tail = events.children?.at(-1);
  if (tail === undefined) throw new ChromiumProjectionError('captureSyntax', 'lastEventMissing');
  if (!/^\s*,?\s*$/u.test(text.slice(tail.offset + tail.length))) {
    throw new ChromiumProjectionError('captureSyntax', 'suffixNotAdmitted');
  }
}

export function projectChromiumNetworkCapture(
  text: string
): ReturnType<typeof projectChromiumNetworkLog> &
  Readonly<{ captureState: 'complete' | 'terminated' }> {
  const errors: ParseError[] = [];
  const root = parseTree(text, errors, { allowTrailingComma: true, disallowComments: true });
  assertCaptureSyntax(text, root, errors);
  return {
    ...projectChromiumNetworkLog(getNodeValue(root)),
    captureState: errors.length === 0 ? ('complete' as const) : ('terminated' as const),
  };
}
