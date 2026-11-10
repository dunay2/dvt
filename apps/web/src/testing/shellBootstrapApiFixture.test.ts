/** Owned concern: verify explicit bootstrap fixtures through the actual first-match fetch adapter. */
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  getE2eApiCalls,
  installE2eApiFetchStub,
  resetE2eApiStubs,
  stubE2eJsonApi,
} from '../../cypress/support/e2eApiStub';
import { stubShellBootstrapApis } from '../../cypress/support/workspaceSession';

function controlledBrowser(): {
  browser: Parameters<typeof installE2eApiFetchStub>[0];
  network: Mock<() => Promise<Response>>;
} {
  // These are real HTTP primitives; only unmatched external network I/O is a test double.
  const network = vi.fn(async () => new Response('unmatched', { status: 418 }));
  const browser = { fetch: network, Request, Response, Headers } as unknown as Parameters<
    typeof installE2eApiFetchStub
  >[0];
  installE2eApiFetchStub(browser);
  return { browser, network };
}

afterEach(() => resetE2eApiStubs());

describe('Controlled shell bootstrap fixtures', () => {
  it('preserves the existing session and healthy probe defaults', async () => {
    stubShellBootstrapApis();
    const { browser, network } = controlledBrowser();
    const session = await browser.fetch('http://fixture.test/session');
    expect(await session.json()).toMatchObject({
      grants: { scopes: ['workspace:graph-draft:view', 'workspace:graph-draft:save'] },
    });
    for (const [endpoint, expected] of [
      ['/healthz', { ok: true, status: 'healthy' }],
      ['/readyz', { ok: true, status: 'ready' }],
      ['/version', { name: 'dvt-api', version: '1.0.0' }],
      ['/db/ready', { ok: true, reason: null }],
    ] as const) {
      const response = await browser.fetch(`http://fixture.test${endpoint}`);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject(expected);
      expect(getE2eApiCalls(endpoint, 'GET')).toHaveLength(1);
    }
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    { key: 'healthz', endpoint: '/healthz', status: 503 },
    { key: 'readyz', endpoint: '/readyz', status: 403 },
    { key: 'version', endpoint: '/version', status: 404 },
    { key: 'dbReady', endpoint: '/db/ready', status: 503 },
  ])(
    'registers the configured $key response once instead of a shadowed duplicate',
    async ({ key, endpoint, status }) => {
      // Later duplicate registrations previously left Admin observing the healthy bootstrap response.
      const configured = {
        scopes: ['fixture-variant'],
        health: {
          [key]: {
            statusCode: status,
            body: { reason: `${key} denied` },
            headers: { 'x-fixture': key },
          },
        },
      };
      stubShellBootstrapApis(configured);
      const { browser, network } = controlledBrowser();
      const response = await browser.fetch(`http://fixture.test${endpoint}`);
      expect(response.status).toBe(status);
      expect(response.headers.get('x-fixture')).toBe(key);
      expect(await response.json()).toEqual({ reason: `${key} denied` });
      expect(getE2eApiCalls(endpoint, 'GET')).toHaveLength(1);
      expect(network).not.toHaveBeenCalled();
      const session = await browser.fetch('http://fixture.test/session');
      expect(await session.json()).toMatchObject({ grants: { scopes: ['fixture-variant'] } });
    }
  );

  it('preserves explicit capability response status, headers and denial reason', async () => {
    const configured = {
      scopes: ['fixture-variant'],
      capabilities: {
        statusCode: 202,
        headers: { 'x-fixture': 'capabilities' },
        body: { plugins: { cost: { available: false, reason: 'Operator policy.' } } },
      },
    };
    stubShellBootstrapApis(configured);
    const { browser, network } = controlledBrowser();
    const response = await browser.fetch('http://fixture.test/capabilities');
    expect(response.status).toBe(202);
    expect(response.headers.get('x-fixture')).toBe('capabilities');
    expect(await response.json()).toEqual(configured.capabilities.body);
    expect(network).not.toHaveBeenCalled();
  });

  it('keeps capabilities unregistered when no capability fixture was requested', async () => {
    stubShellBootstrapApis();
    const { browser, network } = controlledBrowser();
    expect((await browser.fetch('http://fixture.test/capabilities')).status).toBe(418);
    expect(network).toHaveBeenCalledOnce();
    expect(getE2eApiCalls('/capabilities', 'GET')).toHaveLength(0);
  });

  it('resets a configured response and observed calls before the next bootstrap', async () => {
    const configured = { scopes: [], health: { readyz: { statusCode: 403, body: null } } };
    stubShellBootstrapApis(configured);
    const { browser } = controlledBrowser();
    const denied = await browser.fetch('http://fixture.test/readyz');
    expect(denied.status).toBe(403);
    expect(await denied.text()).toBe('');
    stubShellBootstrapApis();
    const ready = await browser.fetch('http://fixture.test/readyz');
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ ok: true, status: 'ready' });
    expect(getE2eApiCalls('/readyz', 'GET')).toHaveLength(1);
  });

  it('retains first-match priority instead of changing global fixture semantics', async () => {
    stubShellBootstrapApis();
    stubE2eJsonApi('GET', '/readyz', { error: 'later duplicate' }, { statusCode: 503 });
    const { browser } = controlledBrowser();
    const response = await browser.fetch('http://fixture.test/readyz');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: 'ready' });
  });
});
