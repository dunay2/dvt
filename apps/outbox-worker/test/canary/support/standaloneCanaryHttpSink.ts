import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import type { EventEnvelope as RunEventPersisted } from '@dvt/contracts';

import { cloneEvent } from './standaloneCanaryEventSupport.js';

export interface SinkPayload {
  events: RunEventPersisted[];
}

export interface HttpSinkHandle {
  url: string;
  requests: SinkPayload[];
  appliedEffects: RunEventPersisted[];
  duplicateKeys: string[];
  close(): Promise<void>;
}

export interface HttpSinkOptions {
  statusCode?: number;
  responseBody?: Record<string, unknown>;
  responseSequence?: HttpSinkResponse[];
  idempotentBy?: 'eventId' | 'idempotencyKey';
}

interface HttpSinkResponse {
  statusCode: number;
  responseBody: Record<string, unknown>;
}

interface HttpSinkRuntime {
  appliedEffects: RunEventPersisted[];
  duplicateKeys: string[];
  options: HttpSinkOptions;
  requests: SinkPayload[];
  seenKeys: Set<string>;
}

export async function startHttpSink(options: HttpSinkOptions = {}): Promise<HttpSinkHandle> {
  const requests: SinkPayload[] = [];
  const appliedEffects: RunEventPersisted[] = [];
  const duplicateKeys: string[] = [];
  const runtime: HttpSinkRuntime = {
    appliedEffects,
    duplicateKeys,
    options,
    requests,
    seenKeys: new Set<string>(),
  };
  const server = createServer((request, response) => {
    void handleSinkRequest({ request, response, runtime }).catch((error: unknown) => {
      response.statusCode = 500;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: toErrorMessage(error) }));
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('expected the HTTP sink to bind to a TCP address');
  }

  return {
    url: `http://127.0.0.1:${address.port}/outbox/events`,
    requests,
    appliedEffects,
    duplicateKeys,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function handleSinkRequest(
  args: {
    request: IncomingMessage;
    response: ServerResponse<IncomingMessage>;
    runtime: HttpSinkRuntime;
  }
): Promise<void> {
  const { request, response, runtime } = args;
  if (request.method !== 'POST' || request.url !== '/outbox/events') {
    response.statusCode = 404;
    response.end();
    return;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const sinkPayload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as SinkPayload;
  const responsePlan = resolveSinkResponse(runtime.options, runtime.requests.length);
  runtime.requests.push(sinkPayload);
  applySinkEffects(sinkPayload, runtime);
  response.statusCode = responsePlan.statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(responsePlan.responseBody));
}

function applySinkEffects(sinkPayload: SinkPayload, runtime: HttpSinkRuntime): void {
  for (const event of sinkPayload.events) {
    if (shouldSkipDuplicateEffect(event, runtime)) {
      continue;
    }

    runtime.appliedEffects.push(cloneEvent(event));
  }
}

function shouldSkipDuplicateEffect(
  event: RunEventPersisted,
  runtime: HttpSinkRuntime
): boolean {
  const key = resolveSinkIdempotencyKey(event, runtime.options.idempotentBy);
  if (key === null) {
    return false;
  }

  return registerSinkIdempotencyKey(key, runtime);
}

function registerSinkIdempotencyKey(key: string, runtime: HttpSinkRuntime): boolean {
  if (!runtime.seenKeys.has(key)) {
    runtime.seenKeys.add(key);
    return false;
  }

  recordDuplicateKey(key, runtime.duplicateKeys);
  return true;
}

function recordDuplicateKey(key: string, duplicateKeys: string[]): void {
  if (!duplicateKeys.includes(key)) {
    duplicateKeys.push(key);
  }
}

function resolveSinkIdempotencyKey(
  event: RunEventPersisted,
  idempotentBy: HttpSinkOptions['idempotentBy']
): string | null {
  switch (idempotentBy) {
    case 'eventId':
      return event.eventId;
    case 'idempotencyKey':
      return event.idempotencyKey;
    default:
      return null;
  }
}

function resolveSinkResponse(options: HttpSinkOptions, requestIndex: number): HttpSinkResponse {
  const responseSequence = options.responseSequence;
  if (responseSequence && responseSequence.length > 0) {
    const response = responseSequence[Math.min(requestIndex, responseSequence.length - 1)];
    if (response !== undefined) {
      return response;
    }
  }

  return {
    statusCode: options.statusCode ?? 200,
    responseBody: options.responseBody ?? { ok: true },
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error === null) {
    return 'null';
  }

  if (typeof error === 'object') {
    return stringifyObjectError(error);
  }

  return stringifyScalarError(error);
}

function stringifyScalarError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (isSimpleScalarError(error)) {
    return String(error);
  }

  if (typeof error === 'symbol') {
    return stringifySymbolError(error);
  }

  if (typeof error === 'function') {
    return stringifyFunctionError(error);
  }

  return 'UnknownErrorValue';
}

function isSimpleScalarError(error: unknown): error is number | boolean | bigint | undefined {
  return (
    typeof error === 'number' ||
    typeof error === 'boolean' ||
    typeof error === 'bigint' ||
    typeof error === 'undefined'
  );
}

function stringifySymbolError(error: symbol): string {
  return error.description ?? error.toString();
}

function stringifyFunctionError(error: Function): string {
  return error.name ? `[function ${error.name}]` : '[function anonymous]';
}

function stringifyObjectError(error: object): string {
  const serialized = safeSerializeObject(error);
  if (serialized !== null) {
    return serialized;
  }

  const constructorName = error.constructor?.name;
  return constructorName && constructorName !== 'Object'
    ? constructorName
    : 'UnserializableErrorObject';
}

function safeSerializeObject(value: object): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
