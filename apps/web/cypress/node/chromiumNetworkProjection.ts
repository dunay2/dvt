/** Owned concern: project trusted Chromium net-log into credential-free correlation evidence. */
import {
  findNodeAtLocation,
  getNodeValue,
  parseTree,
  printParseErrorCode,
  type ParseError,
} from 'jsonc-parser';
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

export function projectChromiumProcessLog(text: string | undefined):
  | Readonly<{ state: 'unavailable' }>
  | Readonly<{
      state: 'observed';
      networkServiceRestarts: readonly Readonly<{
        processId: number;
        threadId: number;
        time: string;
      }>[];
    }> {
  if (text === undefined) return { state: 'unavailable' };
  const networkServiceRestarts = text.split(/\r?\n/u).flatMap((line) => {
    const match =
      /^\[(\d+):(\d+):(\d{4}\/\d{6}\.\d{6}):ERROR:(?:[A-Za-z0-9_./\\-]*[/\\])?network_service_instance_impl\.cc(?::\d+|\(\d+\))\] Network service crashed or was terminated, restarting service\.$/u.exec(
        line
      );
    if (
      match === null ||
      typeof match[3] !== 'string' ||
      !Number.isSafeInteger(Number(match[1])) ||
      !Number.isSafeInteger(Number(match[2]))
    )
      return [];
    return [{ processId: Number(match[1]), threadId: Number(match[2]), time: match[3] }];
  });
  return { state: 'observed', networkServiceRestarts };
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
    throw new Error('Invalid Chromium network log');
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
      throw new Error('Invalid Chromium network log');
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

export function projectChromiumNetworkCapture(
  text: string
): ReturnType<typeof projectChromiumNetworkLog> &
  Readonly<{ captureState: 'complete' | 'terminated' }> {
  const errors: ParseError[] = [];
  const root = parseTree(text, errors, { allowTrailingComma: true, disallowComments: true });
  const events = root === undefined ? undefined : findNodeAtLocation(root, ['events']);
  const constants = root === undefined ? undefined : findNodeAtLocation(root, ['constants']);
  const tail = events?.children?.at(-1);
  const validClosedObject = (offset: number, length: number): boolean =>
    text[offset + length - 1] === '}';
  if (
    root === undefined ||
    events?.type !== 'array' ||
    constants?.type !== 'object' ||
    !validClosedObject(constants.offset, constants.length) ||
    events.children?.some(
      (event) => event.type !== 'object' || !validClosedObject(event.offset, event.length)
    ) ||
    errors.some(
      (error) =>
        error.offset !== text.length ||
        !['CloseBraceExpected', 'CloseBracketExpected', 'ValueExpected'].includes(
          printParseErrorCode(error.error)
        )
    ) ||
    (errors.length > 0 &&
      (tail === undefined || !/^\s*,?\s*$/u.test(text.slice(tail.offset + tail.length))))
  ) {
    throw new Error('Invalid Chromium network capture');
  }
  return {
    ...projectChromiumNetworkLog(getNodeValue(root)),
    captureState: errors.length === 0 ? ('complete' as const) : ('terminated' as const),
  };
}
