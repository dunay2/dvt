/** Owned concern: prove sanitized Chromium error evidence without credential or payload publication. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  projectChromiumNetworkLog,
  projectChromiumNetworkCapture,
} = require('../apps/web/cypress/node/chromiumNetworkProjection.ts');

function netlog(url = 'http://user:secret@127.0.0.1:3300/workspace/graph/draft?token=private') {
  return {
    constants: { logEventTypes: { URL_REQUEST_START_JOB: 1, CORS_PREFLIGHT_ERROR: 2 } },
    events: [
      {
        type: 1,
        time: '123',
        phase: 0,
        source: { id: 7, type: 1 },
        params: {
          url,
          method: 'PUT',
          net_error: -2,
          headers: ['Authorization: Bearer private'],
          body: 'private',
        },
      },
    ],
  };
}

test('exports only event correlation, method, numeric error and safe loopback route', () => {
  const result = projectChromiumNetworkLog(netlog());
  assert.deepEqual(result, {
    schemaVersion: 1,
    events: [
      {
        kind: 'URL_REQUEST_START_JOB',
        time: '123',
        phase: 0,
        sourceId: 7,
        method: 'PUT',
        netError: -2,
        origin: 'http://127.0.0.1:3300',
        route: '/workspace/graph/draft',
      },
    ],
  });
  assert.doesNotMatch(JSON.stringify(result), /private|secret|Authorization|headers|body|token/);
});

test('unknown routes and external URLs cannot publish their path or credentials', () => {
  const unknown = projectChromiumNetworkLog(netlog('http://127.0.0.1:3300/private-token'));
  assert.equal(unknown.events[0].route, '/other');
  const external = projectChromiumNetworkLog(
    netlog('https://user:secret@example.com/private-token')
  );
  assert.equal(external.events[0].origin, undefined);
  assert.doesNotMatch(JSON.stringify(external), /secret|example|private/);
});

test('projects CORS event kind and numeric error without arbitrary failure parameters', () => {
  const input = netlog();
  input.events[0].type = 2;
  input.events[0].params = { net_error: -2, failed_parameter: 'private', cookie: 'private' };
  const result = projectChromiumNetworkLog(input);
  assert.equal(result.events[0].kind, 'CORS_PREFLIGHT_ERROR');
  assert.equal(result.events[0].netError, -2);
  assert.doesNotMatch(JSON.stringify(result), /private|cookie|failed_parameter/);
});

test('correlates known compiled CSS assets with observed HTTP status without exporting headers', () => {
  for (const asset of ['index-Cq5vnsls', 'Canvas-Dqu6Pn90', 'RunsView-Dcs-ZTu0']) {
    const input = netlog(`http://user:secret@127.0.0.1:4173/assets/${asset}.css?token=private`);
    input.constants.logEventTypes.HTTP_TRANSACTION_READ_RESPONSE_HEADERS = 3;
    input.events.push({
      type: 3,
      source: { id: 7, type: 1 },
      params: { headers: ['HTTP/1.1 404 Not Found', 'Set-Cookie: private', 'X-Token: private'] },
    });
    const result = projectChromiumNetworkLog(input);
    assert.equal(result.events[0].route, `/assets/${asset}.css`);
    assert.equal(result.events[1].sourceId, result.events[0].sourceId);
    assert.equal(result.events[1].statusCode, 404);
    assert.doesNotMatch(JSON.stringify(result), /private|secret|Cookie|headers|Token/);
  }
});

test('only recognized response status lines supply an HTTP outcome', () => {
  for (const [headers, statusCode] of [
    [['HTTP/1.1 200 OK'], 200],
    [['HTTP/2 503 Unavailable'], 503],
    [['Authorization: HTTP/1.1 200 private'], undefined],
    [['HTTP/1.1 999 private'], undefined],
    [['HTTP/1.1 099 private'], undefined],
    [[null, 'X-Private: secret'], undefined],
    [undefined, undefined],
  ]) {
    const input = netlog();
    input.constants.logEventTypes.HTTP_TRANSACTION_READ_RESPONSE_HEADERS = 3;
    input.events[0].type = 3;
    input.events[0].params = { headers, net_error: -101 };
    const result = projectChromiumNetworkLog(input);
    assert.equal(result.events[0].statusCode, statusCode);
    assert.equal(result.events[0].netError, -101);
    assert.doesNotMatch(JSON.stringify(result), /private|secret|headers|Authorization/);
  }
});

test('arbitrary CSS names and non-loopback assets retain the existing redaction boundary', () => {
  for (const url of [
    'http://127.0.0.1:4173/assets/customer-secret.css',
    'http://127.0.0.1:4173/assets/RunsView-private.css',
    'http://127.0.0.1:4173/assets/RunsView-private/path.css',
    'https://secret.example/assets/RunsView-Dcs-ZTu0.css',
  ]) {
    const result = projectChromiumNetworkLog(netlog(url));
    assert.ok(result.events[0].route === '/other' || result.events[0].route === undefined);
    assert.doesNotMatch(JSON.stringify(result), /customer|secret|private|example|RunsView/);
  }
});

test('missing or malformed capture rejects without including raw input', () => {
  for (const input of [
    null,
    {},
    { constants: {}, events: [] },
    { ...netlog(), events: ['private'] },
  ]) {
    assert.throws(() => projectChromiumNetworkLog(input), /Invalid Chromium network log/);
  }
});

test('terminated footer is explicit and retains only complete observed records', () => {
  const complete = JSON.stringify(netlog());
  const result = projectChromiumNetworkCapture(complete.slice(0, -2) + ',\n');
  assert.equal(result.captureState, 'terminated');
  assert.equal(result.events.length, 1);
  assert.equal(projectChromiumNetworkCapture(complete).captureState, 'complete');
  assert.doesNotMatch(JSON.stringify(result), /private|secret|Authorization/);
});

test('middle corruption and unfinished event bodies cannot become observed evidence', () => {
  const complete = JSON.stringify(netlog());
  for (const input of [
    complete.replace('"source":', 'bad "source":'),
    complete.slice(0, complete.indexOf('"params"') + 10),
    '{"constants":',
  ]) {
    assert.throws(() => projectChromiumNetworkCapture(input), /Invalid Chromium network capture/);
  }
});
