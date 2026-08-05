import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

import {
  HttpJsonArtifactAcquisitionRejectedError,
  HttpJsonArtifactAcquisitionRuntimeError,
  type HttpJsonAcquireInput,
  type HttpJsonAcquireResult,
  type HttpJsonAcquisitionClient,
} from '@dvt/temporal-http-json-plugin';

export interface ResolvedNetworkAddress {
  readonly address: string;
  readonly family: 4 | 6;
}

export interface NodeHttpsTransportInput {
  readonly url: globalThis.URL;
  readonly resolvedAddress: string;
  readonly addressFamily: 4 | 6;
  readonly headers: Readonly<Record<string, string>>;
  readonly connectTimeoutMs: number;
  readonly requestTimeoutMs: number;
  readonly ca?: string | Buffer;
  readonly signal?: globalThis.AbortSignal;
}

export interface NodeHttpsTransportResult {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: AsyncIterable<unknown>;
}

export type NodeHttpsTransport = (
  input: NodeHttpsTransportInput
) => Promise<NodeHttpsTransportResult>;

export interface NodeHttpsJsonClientOptions {
  readonly endpoints: ReadonlyMap<string, string>;
  readonly authTokens: ReadonlyMap<string, string>;
  readonly nodeEnv?: 'development' | 'test' | 'production';
  readonly allowLoopbackFixture?: boolean;
  readonly ca?: string | Buffer;
  readonly lookupAddresses?: (hostname: string) => Promise<readonly ResolvedNetworkAddress[]>;
  readonly transport?: NodeHttpsTransport;
}

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export class NodeHttpsJsonClient implements HttpJsonAcquisitionClient {
  private readonly lookupAddresses: NonNullable<NodeHttpsJsonClientOptions['lookupAddresses']>;
  private readonly transport: NodeHttpsTransport;

  public constructor(private readonly options: NodeHttpsJsonClientOptions) {
    this.lookupAddresses = options.lookupAddresses ?? resolveAddresses;
    this.transport = options.transport ?? executeHttpsRequest;
  }

  public async acquire(input: HttpJsonAcquireInput): Promise<HttpJsonAcquireResult> {
    const endpoint = this.options.endpoints.get(input.endpointRef);
    if (endpoint === undefined) reject('HTTP_JSON_ENDPOINT_REF_DENIED');
    const authToken = resolveAuthToken(this.options.authTokens, input.authCredentialRef);
    const initialUrl = parseHttpsEndpoint(endpoint);

    try {
      return await this.acquireHop(initialUrl, initialUrl.origin, authToken, input, 0);
    } catch (error) {
      if (
        error instanceof HttpJsonArtifactAcquisitionRejectedError ||
        error instanceof HttpJsonArtifactAcquisitionRuntimeError
      ) {
        throw error;
      }
      if (input.signal?.aborted === true) throw input.signal.reason ?? error;
      throw new HttpJsonArtifactAcquisitionRuntimeError('HTTP_JSON_REQUEST_FAILED');
    }
  }

  private async acquireHop(
    url: globalThis.URL,
    approvedOrigin: string,
    authToken: string | undefined,
    input: HttpJsonAcquireInput,
    redirectCount: number
  ): Promise<HttpJsonAcquireResult> {
    const addresses = await this.lookupAddresses(url.hostname);
    if (addresses.length === 0) reject('HTTP_JSON_NETWORK_TARGET_DENIED');
    const allowLoopback =
      this.options.allowLoopbackFixture === true && this.options.nodeEnv !== 'production';
    for (const candidate of addresses) {
      if (isForbiddenAddress(candidate.address, allowLoopback)) {
        reject('HTTP_JSON_NETWORK_TARGET_DENIED');
      }
    }
    const selected = addresses[0];
    if (selected === undefined) reject('HTTP_JSON_NETWORK_TARGET_DENIED');

    const response = await this.transport({
      url,
      resolvedAddress: selected.address,
      addressFamily: selected.family,
      headers: {
        accept: input.accept,
        'accept-encoding': 'identity',
        ...(authToken === undefined ? {} : { authorization: `Bearer ${authToken}` }),
      },
      connectTimeoutMs: input.connectTimeoutMs,
      requestTimeoutMs: input.requestTimeoutMs,
      ...(this.options.ca === undefined ? {} : { ca: this.options.ca }),
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    });

    if (REDIRECT_STATUS_CODES.has(response.statusCode)) {
      destroyBody(response.body);
      if (redirectCount >= input.maxRedirects) reject('HTTP_JSON_REDIRECT_LIMIT_EXCEEDED');
      const location = singleHeader(response.headers['location']);
      if (location === undefined) reject('HTTP_JSON_REDIRECT_TARGET_DENIED');
      const nextUrl = parseRedirect(location, url);
      if (nextUrl.origin !== approvedOrigin) reject('HTTP_JSON_REDIRECT_TARGET_DENIED');
      return this.acquireHop(nextUrl, approvedOrigin, authToken, input, redirectCount + 1);
    }

    if (response.statusCode !== input.acceptedStatus) {
      destroyBody(response.body);
      reject('HTTP_JSON_STATUS_MISMATCH');
    }
    const contentEncoding = singleHeader(response.headers['content-encoding']);
    if (contentEncoding !== undefined && contentEncoding.trim().toLowerCase() !== 'identity') {
      destroyBody(response.body);
      reject('HTTP_JSON_CONTENT_ENCODING_DENIED');
    }
    const contentType = normalizeMediaType(singleHeader(response.headers['content-type']));
    if (contentType !== input.accept) {
      destroyBody(response.body);
      reject('HTTP_JSON_MEDIA_TYPE_MISMATCH');
    }
    const declaredLength = parseContentLength(singleHeader(response.headers['content-length']));
    if (declaredLength !== undefined && declaredLength > input.maxBytes) {
      destroyBody(response.body);
      reject('HTTP_JSON_SIZE_LIMIT_EXCEEDED');
    }

    const bytes = await readBoundedBody(response.body, input.maxBytes);
    validateJson(bytes, input.format);
    return {
      bytes,
      statusCode: response.statusCode,
      mediaType: contentType,
      redirectCount,
    };
  }
}

async function resolveAddresses(hostname: string): Promise<readonly ResolvedNetworkAddress[]> {
  if (isIP(hostname) !== 0) {
    return [{ address: hostname, family: isIP(hostname) as 4 | 6 }];
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses.map(({ address, family }) => ({ address, family: family as 4 | 6 }));
}

function resolveAuthToken(
  bindings: ReadonlyMap<string, string>,
  reference: string | undefined
): string | undefined {
  if (reference === undefined) return undefined;
  const token = bindings.get(reference);
  if (token === undefined) reject('HTTP_JSON_AUTH_REF_DENIED');
  return token;
}

function parseHttpsEndpoint(value: string): globalThis.URL {
  let url: globalThis.URL;
  try {
    url = new globalThis.URL(value);
  } catch {
    reject('HTTP_JSON_ENDPOINT_REF_DENIED');
  }
  if (
    url.protocol !== 'https:' ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.hash.length > 0
  ) {
    reject('HTTP_JSON_ENDPOINT_REF_DENIED');
  }
  return url;
}

function parseRedirect(location: string, current: globalThis.URL): globalThis.URL {
  let next: globalThis.URL;
  try {
    next = new globalThis.URL(location, current);
  } catch {
    reject('HTTP_JSON_REDIRECT_TARGET_DENIED');
  }
  if (
    next.protocol !== 'https:' ||
    next.username.length > 0 ||
    next.password.length > 0 ||
    next.hash.length > 0
  ) {
    reject('HTTP_JSON_REDIRECT_TARGET_DENIED');
  }
  return next;
}

function isForbiddenAddress(address: string, allowLoopback: boolean): boolean {
  const family = isIP(address);
  if (family === 4) return isForbiddenIpv4(address, allowLoopback);
  if (family === 6) return isForbiddenIpv6(address, allowLoopback);
  return true;
}

function isForbiddenIpv4(address: string, allowLoopback: boolean): boolean {
  const octets = address.split('.').map(Number);
  const [a = -1, b = -1] = octets;
  if (a === 127) return !allowLoopback;
  return (
    a === 0 ||
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isForbiddenIpv6(address: string, allowLoopback: boolean): boolean {
  const normalized = address.toLowerCase();
  if (normalized === '::1') return !allowLoopback;
  if (normalized === '::') return true;
  if (normalized.startsWith('::ffff:')) {
    const mappedIpv4 = parseMappedIpv4(normalized.slice('::ffff:'.length));
    return mappedIpv4 === undefined || isForbiddenIpv4(mappedIpv4, allowLoopback);
  }
  const first = Number.parseInt(normalized.split(':', 1)[0] ?? '', 16);
  return (
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    (first >= 0xfe80 && first <= 0xfebf) ||
    normalized.startsWith('ff')
  );
}

function parseMappedIpv4(mapped: string): string | undefined {
  if (isIP(mapped) === 4) return mapped;
  const hextets = mapped.split(':');
  if (hextets.length !== 2 || hextets.some((hextet) => !/^[0-9a-f]{1,4}$/u.test(hextet))) {
    return undefined;
  }
  const high = Number.parseInt(hextets[0] ?? '', 16);
  const low = Number.parseInt(hextets[1] ?? '', 16);
  return `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`;
}

async function readBoundedBody(
  body: AsyncIterable<unknown>,
  maxBytes: number
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const rawChunk of body) {
    const chunk =
      typeof rawChunk === 'string'
        ? Buffer.from(rawChunk, 'utf8')
        : rawChunk instanceof Uint8Array
          ? rawChunk
          : undefined;
    if (chunk === undefined) reject('HTTP_JSON_PAYLOAD_INVALID');
    total += chunk.byteLength;
    if (total > maxBytes) {
      destroyBody(body);
      reject('HTTP_JSON_SIZE_LIMIT_EXCEEDED');
    }
    chunks.push(chunk);
  }
  return Uint8Array.from(
    Buffer.concat(
      chunks.map((chunk) => Buffer.from(chunk)),
      total
    )
  );
}

function validateJson(bytes: Uint8Array, format: 'json' | 'jsonl'): void {
  try {
    const text = new globalThis.TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (format === 'json') {
      JSON.parse(text);
      return;
    }
    const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
    if (lines.length === 0) reject('HTTP_JSON_PAYLOAD_INVALID');
    for (const line of lines) JSON.parse(line);
  } catch (error) {
    if (error instanceof HttpJsonArtifactAcquisitionRejectedError) throw error;
    reject('HTTP_JSON_PAYLOAD_INVALID');
  }
}

function parseContentLength(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/u.test(value)) reject('HTTP_JSON_CONTENT_LENGTH_INVALID');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) reject('HTTP_JSON_CONTENT_LENGTH_INVALID');
  return parsed;
}

function normalizeMediaType(value: string | undefined): string {
  return value?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? undefined : value;
}

function destroyBody(body: AsyncIterable<unknown>): void {
  const destroy = (body as { destroy?: () => void }).destroy;
  if (typeof destroy === 'function') destroy.call(body);
}

function executeHttpsRequest(input: NodeHttpsTransportInput): Promise<NodeHttpsTransportResult> {
  return new Promise((resolve, rejectPromise) => {
    const authority =
      input.url.port.length > 0 ? `${input.url.hostname}:${input.url.port}` : input.url.hostname;
    const request = httpsRequest({
      protocol: 'https:',
      hostname: input.resolvedAddress,
      family: input.addressFamily,
      port: input.url.port.length === 0 ? 443 : Number(input.url.port),
      path: `${input.url.pathname}${input.url.search}`,
      method: 'GET',
      servername: isIP(input.url.hostname) === 0 ? input.url.hostname : undefined,
      rejectUnauthorized: true,
      ...(input.ca === undefined ? {} : { ca: input.ca }),
      headers: { ...input.headers, host: authority },
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    });
    const requestTimer = globalThis.setTimeout(
      () => request.destroy(new Error('HTTP_JSON_REQUEST_TIMEOUT')),
      input.requestTimeoutMs
    );
    request.once('socket', (socket) => {
      const connectTimer = globalThis.setTimeout(
        () => request.destroy(new Error('HTTP_JSON_CONNECT_TIMEOUT')),
        input.connectTimeoutMs
      );
      socket.once('secureConnect', () => globalThis.clearTimeout(connectTimer));
      socket.once('close', () => globalThis.clearTimeout(connectTimer));
    });
    request.once('response', (response) => {
      const clearRequestTimer = (): void => globalThis.clearTimeout(requestTimer);
      response.once('end', clearRequestTimer);
      response.once('close', clearRequestTimer);
      response.once('error', clearRequestTimer);
      resolve({
        statusCode: response.statusCode ?? 0,
        headers: response.headers,
        body: response,
      });
    });
    request.once('error', (error) => {
      globalThis.clearTimeout(requestTimer);
      rejectPromise(error);
    });
    request.end();
  });
}

function reject(code: string): never {
  throw new HttpJsonArtifactAcquisitionRejectedError(code);
}
