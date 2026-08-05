import { describe, expect, it, vi } from 'vitest';

import {
  NodeHttpsJsonClient,
  normalizeHttpsHostname,
  shouldStartHttpsConnectTimer,
  type NodeHttpsTransport,
} from '../../src/runtime/nodeHttpsJsonClient.js';

async function* chunks(...values: string[]): AsyncIterable<Uint8Array> {
  for (const value of values) yield Buffer.from(value, 'utf8');
}

describe('NodeHttpsJsonClient', () => {
  it('rejects unknown refs and private DNS results before opening a request', async () => {
    const transport = vi.fn<NodeHttpsTransport>();
    const client = new NodeHttpsJsonClient({
      endpoints: new Map([['http-endpoint:orders', 'https://orders.example.test/data']]),
      authTokens: new Map(),
      lookupAddresses: vi.fn(async () => [{ address: '10.0.0.4', family: 4 as const }]),
      transport,
    });

    await expect(client.acquire(request('http-endpoint:missing'))).rejects.toMatchObject({
      code: 'HTTP_JSON_ENDPOINT_REF_DENIED',
    });
    await expect(client.acquire(request())).rejects.toMatchObject({
      code: 'HTTP_JSON_NETWORK_TARGET_DENIED',
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it('rejects hexadecimal IPv4-mapped private and metadata addresses', async () => {
    for (const address of [
      '::ffff:a00:4',
      '::ffff:a9fe:a9fe',
      '::127.0.0.1',
      '::169.254.169.254',
      '64:ff9b::a9fe:a9fe',
    ]) {
      const transport = vi.fn<NodeHttpsTransport>();
      const client = new NodeHttpsJsonClient({
        endpoints: new Map([['http-endpoint:orders', 'https://orders.example.test/data']]),
        authTokens: new Map(),
        lookupAddresses: vi.fn(async () => [{ address, family: 6 as const }]),
        transport,
      });

      await expect(client.acquire(request())).rejects.toMatchObject({
        code: 'HTTP_JSON_NETWORK_TARGET_DENIED',
      });
      expect(transport).not.toHaveBeenCalled();
    }
  });

  it('re-resolves same-origin redirects and rejects a rebinding destination', async () => {
    const lookupAddresses = vi
      .fn<() => Promise<readonly { address: string; family: 4 }[]>>()
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
      .mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
    const transport = vi.fn<NodeHttpsTransport>(async () => ({
      statusCode: 302,
      headers: { location: '/redirected' },
      body: chunks(),
    }));
    const client = new NodeHttpsJsonClient({
      endpoints: new Map([['http-endpoint:orders', 'https://orders.example.test/data']]),
      authTokens: new Map(),
      lookupAddresses,
      transport,
    });

    await expect(client.acquire(request())).rejects.toMatchObject({
      code: 'HTTP_JSON_NETWORK_TARGET_DENIED',
    });
    expect(lookupAddresses).toHaveBeenCalledTimes(2);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('normalizes bracketed IPv6 literals before lookup and TLS classification', async () => {
    const lookupAddresses = vi.fn(async () => [
      { address: '2606:4700:4700::1111', family: 6 as const },
    ]);
    const transport = vi.fn<NodeHttpsTransport>(async () => ({
      statusCode: 200,
      headers: { 'content-type': 'application/x-ndjson' },
      body: chunks('{"order_id":1}\n'),
    }));
    const client = new NodeHttpsJsonClient({
      endpoints: new Map([['http-endpoint:orders', 'https://[2606:4700:4700::1111]/data']]),
      authTokens: new Map(),
      lookupAddresses,
      transport,
    });

    await expect(client.acquire(request())).resolves.toMatchObject({ statusCode: 200 });
    expect(lookupAddresses).toHaveBeenCalledWith('2606:4700:4700::1111');
    expect(normalizeHttpsHostname('[2606:4700:4700::1111]')).toBe('2606:4700:4700::1111');
  });

  it('only arms the connect timeout while the assigned socket is connecting', () => {
    expect(shouldStartHttpsConnectTimer({ connecting: true })).toBe(true);
    expect(shouldStartHttpsConnectTimer({ connecting: false })).toBe(false);
  });

  it('bounds same-origin redirect chains', async () => {
    const transport = vi.fn<NodeHttpsTransport>(async () => ({
      statusCode: 302,
      headers: { location: '/redirected' },
      body: chunks(),
    }));
    const client = new NodeHttpsJsonClient({
      endpoints: new Map([['http-endpoint:orders', 'https://orders.example.test/data']]),
      authTokens: new Map(),
      lookupAddresses: vi.fn(async () => [{ address: '93.184.216.34', family: 4 as const }]),
      transport,
    });

    await expect(client.acquire(request(undefined, { maxRedirects: 1 }))).rejects.toMatchObject({
      code: 'HTTP_JSON_REDIRECT_LIMIT_EXCEEDED',
    });
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      'compressed content',
      {
        statusCode: 200,
        headers: {
          'content-type': 'application/x-ndjson',
          'content-encoding': 'gzip',
        },
        body: chunks('compressed'),
      },
      'HTTP_JSON_CONTENT_ENCODING_DENIED',
    ],
    [
      'wrong status',
      {
        statusCode: 503,
        headers: { 'content-type': 'application/x-ndjson' },
        body: chunks('unavailable'),
      },
      'HTTP_JSON_STATUS_MISMATCH',
    ],
    [
      'wrong media type',
      {
        statusCode: 200,
        headers: { 'content-type': 'text/plain' },
        body: chunks('{"order_id":1}\n'),
      },
      'HTTP_JSON_MEDIA_TYPE_MISMATCH',
    ],
    [
      'malformed JSON Lines',
      {
        statusCode: 200,
        headers: { 'content-type': 'application/x-ndjson' },
        body: chunks('{not-json}\n'),
      },
      'HTTP_JSON_PAYLOAD_INVALID',
    ],
  ])('rejects %s with a stable policy code', async (_label, response, code) => {
    const client = new NodeHttpsJsonClient({
      endpoints: new Map([['http-endpoint:orders', 'https://orders.example.test/data']]),
      authTokens: new Map(),
      lookupAddresses: vi.fn(async () => [{ address: '93.184.216.34', family: 4 as const }]),
      transport: vi.fn<NodeHttpsTransport>(async () => response),
    });

    await expect(client.acquire(request())).rejects.toMatchObject({ code });
  });

  it('omits optional auth and redacts transport failure detail', async () => {
    const successfulTransport = vi.fn<NodeHttpsTransport>(async () => ({
      statusCode: 200,
      headers: { 'content-type': 'application/x-ndjson' },
      body: chunks('{"order_id":1}\n'),
    }));
    const options = {
      endpoints: new Map([['http-endpoint:orders', 'https://orders.example.test/data']]),
      authTokens: new Map<string, string>(),
      lookupAddresses: vi.fn(async () => [{ address: '93.184.216.34', family: 4 as const }]),
    };
    const successfulClient = new NodeHttpsJsonClient({
      ...options,
      transport: successfulTransport,
    });

    await expect(successfulClient.acquire(request())).resolves.toMatchObject({ statusCode: 200 });
    expect(successfulTransport.mock.calls[0]?.[0].headers).not.toHaveProperty('authorization');

    const failedClient = new NodeHttpsJsonClient({
      ...options,
      authTokens: new Map([['http-auth:orders', 'transport-secret']]),
      transport: vi.fn<NodeHttpsTransport>(async () => {
        throw new Error('transport-secret https://orders.example.test/data timeout detail');
      }),
    });
    let failure: unknown;
    try {
      await failedClient.acquire(request(undefined, { authCredentialRef: 'http-auth:orders' }));
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ code: 'HTTP_JSON_REQUEST_FAILED' });
    expect(String(failure)).not.toContain('transport-secret');
    expect(String(failure)).not.toContain('orders.example.test');
  });

  it('allows an explicitly controlled non-production loopback fixture and keeps secrets out of the result', async () => {
    const transport = vi.fn<NodeHttpsTransport>(async (input) => ({
      statusCode: 200,
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'content-length': '15',
      },
      body: chunks('{"order_id":1}\n'),
    }));
    const client = new NodeHttpsJsonClient({
      endpoints: new Map([['http-endpoint:orders', 'https://fixture.test/orders']]),
      authTokens: new Map([['http-auth:orders', 'fixture-secret']]),
      nodeEnv: 'test',
      allowLoopbackFixture: true,
      lookupAddresses: vi.fn(async () => [{ address: '127.0.0.1', family: 4 as const }]),
      transport,
    });

    const result = await client.acquire(
      request(undefined, { authCredentialRef: 'http-auth:orders' })
    );

    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedAddress: '127.0.0.1',
        headers: expect.objectContaining({ authorization: 'Bearer fixture-secret' }),
      })
    );
    expect(result).toEqual({
      bytes: Uint8Array.from(Buffer.from('{"order_id":1}\n', 'utf8')),
      statusCode: 200,
      mediaType: 'application/x-ndjson',
      redirectCount: 0,
    });
    expect(JSON.stringify(result)).not.toContain('fixture-secret');
    expect(JSON.stringify(result)).not.toContain('fixture.test');
  });

  it('stops streaming at the byte bound and refuses cross-origin redirects', async () => {
    const yielded: number[] = [];
    const oversizedBody = {
      async *[Symbol.asyncIterator]() {
        for (const [index, value] of ['12345678', '90123456', 'never'].entries()) {
          yielded.push(index);
          yield Buffer.from(value, 'utf8');
        }
      },
    };
    const oversizedTransport = vi.fn<NodeHttpsTransport>(async () => ({
      statusCode: 200,
      headers: { 'content-type': 'application/x-ndjson' },
      body: oversizedBody,
    }));
    const publicLookup = vi.fn(async () => [{ address: '93.184.216.34', family: 4 as const }]);
    const oversizedClient = new NodeHttpsJsonClient({
      endpoints: new Map([['http-endpoint:orders', 'https://orders.example.test/data']]),
      authTokens: new Map(),
      lookupAddresses: publicLookup,
      transport: oversizedTransport,
    });

    await expect(
      oversizedClient.acquire(request(undefined, { maxBytes: 10 }))
    ).rejects.toMatchObject({
      code: 'HTTP_JSON_SIZE_LIMIT_EXCEEDED',
    });
    expect(yielded).toEqual([0, 1]);

    const redirectClient = new NodeHttpsJsonClient({
      endpoints: new Map([['http-endpoint:orders', 'https://orders.example.test/data']]),
      authTokens: new Map(),
      lookupAddresses: publicLookup,
      transport: vi.fn<NodeHttpsTransport>(async () => ({
        statusCode: 302,
        headers: { location: 'https://other.example.test/data' },
        body: chunks(),
      })),
    });
    await expect(redirectClient.acquire(request())).rejects.toMatchObject({
      code: 'HTTP_JSON_REDIRECT_TARGET_DENIED',
    });
  });
});

function request(
  endpointRef = 'http-endpoint:orders',
  patch: Partial<Parameters<NodeHttpsJsonClient['acquire']>[0]> = {}
): Parameters<NodeHttpsJsonClient['acquire']>[0] {
  return {
    endpointRef,
    accept: 'application/x-ndjson' as const,
    format: 'jsonl' as const,
    acceptedStatus: 200 as const,
    maxBytes: 1_000,
    connectTimeoutMs: 1_000,
    requestTimeoutMs: 5_000,
    maxRedirects: 1,
    ...patch,
  };
}
