/** Owned concern: prove sanitized Chromium error evidence without credential or payload publication. */
require('tsx/cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  projectChromiumNetworkLog,
  projectChromiumNetworkCapture,
  projectChromiumProcessLog,
} = require('../apps/web/cypress/node/chromiumNetworkProjection.ts');

test('process log admits only the exact restart signal, never raw diagnostics or lookalikes', () => {
  const line =
    '[21:34:1016/093012.123456:ERROR:content/browser/network_service_instance_impl.cc:608] Network service crashed or was terminated, restarting service.';
  assert.deepEqual(
    projectChromiumProcessLog(
      [
        line,
        line.replace(':608]', '(608)]'),
        line + ' private',
        line.replace('network_service_instance_impl.cc', 'private.cc'),
        'private Authorization: Bearer secret https://private.invalid/?token=secret',
      ].join('\n')
    ),
    {
      state: 'observed',
      networkServiceRestarts: [
        { processId: 21, threadId: 34, time: '1016/093012.123456' },
        { processId: 21, threadId: 34, time: '1016/093012.123456' },
      ],
    }
  );
  assert.deepEqual(projectChromiumProcessLog(undefined), { state: 'unavailable' });
  assert.deepEqual(projectChromiumProcessLog(''), {
    state: 'observed',
    networkServiceRestarts: [],
  });
});

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

test('correlates the request clock, dependent socket and status without raw headers', () => {
  const input = netlog();
  input.constants.timeTickOffset = '1789123456000';
  input.events[0].params.source_dependency = { id: 42, type: 9, private: 'secret' };
  input.events[0].params.headers = ['HTTP/1.1 204 No Content', 'Set-Cookie: private'];
  const result = projectChromiumNetworkLog(input);
  assert.equal(result.timeTickOffset, '1789123456000');
  assert.equal(result.events[0].dependencySourceId, 42);
  assert.equal(result.events[0].statusCode, 204);
  assert.doesNotMatch(JSON.stringify(result), /secret|private|Set-Cookie|No Content/);
});

test('invalid correlation values cannot publish arbitrary strings or non-integral IDs', () => {
  for (const value of ['private', null, {}, 1.5, Infinity]) {
    const input = netlog();
    input.constants.timeTickOffset = value;
    input.events[0].params.source_dependency = { id: value };
    input.events[0].params.headers = [value, 'HTTP/1.1 200 private'];
    const result = projectChromiumNetworkLog(input);
    assert.equal(result.timeTickOffset, undefined);
    assert.equal(result.events[0].dependencySourceId, undefined);
    assert.equal(result.events[0].statusCode, undefined);
    assert.doesNotMatch(JSON.stringify(result), /private/);
  }
});

test('normalizes the safe integer clock offset emitted by current Chromium', () => {
  const input = netlog();
  input.constants.timeTickOffset = 1789123456000;
  assert.equal(projectChromiumNetworkLog(input).timeTickOffset, '1789123456000');
  input.constants.timeTickOffset = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(projectChromiumNetworkLog(input).timeTickOffset, undefined);
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
