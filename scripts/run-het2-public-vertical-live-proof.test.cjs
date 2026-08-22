const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { EventEmitter } = require('node:events');
const { readFileSync } = require('node:fs');
const { request } = require('node:https');
const path = require('node:path');

const {
  buildHet2Env,
  buildMinioDockerArgs,
  buildSelectedClosureArgs,
  startHttpsFixture,
  validateHttpJsonFixture,
  waitForChildExit,
} = require('./run-het2-public-vertical-live-proof.cjs');

const fixtureRoot = path.resolve(__dirname, '../apps/web/cypress/fixtures');
const fixtureContent = readFileSync(path.join(fixtureRoot, 'het2-http-json-orders.jsonl'));
const fixtureManifest = JSON.parse(
  readFileSync(path.join(fixtureRoot, 'het2-http-json-orders.manifest.json'), 'utf8')
);

test('pins HET2 JSONL fixture bytes to LF across checkouts', () => {
  const attributes = readFileSync(path.resolve(__dirname, '../.gitattributes'), 'utf8');
  assert.match(attributes, /^apps\/web\/cypress\/fixtures\/\*\.jsonl text eol=lf$/mu);
});

test('validates the tenant-scoped HET2 fixture before infrastructure startup', () => {
  assert.deepEqual(validateHttpJsonFixture(fixtureContent, fixtureManifest), fixtureManifest);
  assert.throws(
    () => validateHttpJsonFixture(Buffer.from('changed'), fixtureManifest),
    /fixture size does not match/
  );
  assert.throws(
    () => validateHttpJsonFixture(fixtureContent, { ...fixtureManifest, objectKey: 'wrong' }),
    /tenant-scoped content hash/
  );
});

test('keeps the HET2 fixture non-unique for the controlled dbt failure proof', () => {
  const rows = fixtureContent
    .toString('utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].order_id, rows[1].order_id);
});

test('starts the pinned MinIO image on loopback only', () => {
  const args = buildMinioDockerArgs({ containerName: 'dvt-het2-proof', port: 19000 });
  assert.equal(args[0], 'run');
  assert.ok(args.includes('127.0.0.1:19000:9000'));
  assert.ok(
    args.includes(
      'minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e'
    )
  );
});

test('enables acquisition and loader against the same real content-addressed store', () => {
  const env = buildHet2Env({
    minioEndpoint: 'http://127.0.0.1:19000',
    fixtureEndpoint: 'https://127.0.0.1:19443/orders',
    manifest: fixtureManifest,
    sourceEnv: { EXISTING: 'kept' },
  });
  assert.equal(env.EXISTING, 'kept');
  assert.equal(env.DVT_TEMPORAL_HTTP_JSON_ENABLED, 'true');
  assert.equal(env.DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED, 'true');
  assert.equal(env.DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF, fixtureManifest.artifactCredentialRef);
  assert.deepEqual(JSON.parse(env.DVT_HTTP_JSON_ENDPOINTS), {
    [fixtureManifest.endpointRef]: 'https://127.0.0.1:19443/orders',
    'http-endpoint:het2-status-failure': 'https://127.0.0.1:19443/status-failure',
    'http-endpoint:het2-integrity-mismatch': 'https://127.0.0.1:19443/integrity-mismatch',
    'http-endpoint:het2-timeout': 'https://127.0.0.1:19443/timeout',
    'http-endpoint:het2-slow-once': 'https://127.0.0.1:19443/slow-once',
  });
  assert.equal(env.DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE, 'true');
});

test('serves only the authorized JSONL fixture over TLS', async (context) => {
  const cert = readFileSync(path.join(fixtureRoot, 'het2-fixture-cert.pem'));
  const key = readFileSync(path.join(fixtureRoot, 'het2-fixture-key.pem'));
  const server = await startHttpsFixture({ content: fixtureContent, cert, key, port: 0 });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.notEqual(address, null);
  const port = typeof address === 'object' ? address.port : 0;
  const response = await requestFixture({ port, cert, token: 'het2-fixture-bearer-token' });
  const bytes = response.body;
  assert.equal(response.statusCode, 200);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), fixtureManifest.sha256);
  const denied = await requestFixture({ port, cert, token: 'wrong' });
  assert.equal(denied.statusCode, 401);
  const failed = await requestFixture({
    port,
    cert,
    token: 'het2-fixture-bearer-token',
    requestPath: '/status-failure',
  });
  assert.equal(failed.statusCode, 503);
  const mismatched = await requestFixture({
    port,
    cert,
    token: 'het2-fixture-bearer-token',
    requestPath: '/integrity-mismatch',
  });
  assert.equal(mismatched.statusCode, 200);
  assert.notEqual(
    createHash('sha256').update(mismatched.body).digest('hex'),
    fixtureManifest.sha256
  );
  assert.equal(mismatched.body.byteLength, fixtureManifest.sizeBytes);
});

function requestFixture({ port, cert, token, requestPath = '/orders' }) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: '127.0.0.1',
        port,
        path: requestPath,
        method: 'GET',
        ca: cert,
        headers: { authorization: `Bearer ${token}` },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.once('error', reject);
        response.once('end', () =>
          resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks) })
        );
      }
    );
    req.once('error', reject);
    req.end();
  });
}

test('delegates to the public HET2 Cypress route and observes early exit', async () => {
  assert.deepEqual(buildSelectedClosureArgs(), [
    'scripts/run-selected-closure-live-proof.cjs',
    '--spec',
    'apps/web/cypress/e2e/canvas/canvas-het2-rest-artifact-dbt-live.cy.ts',
  ]);
  const child = new EventEmitter();
  child.exitCode = 0;
  await assert.doesNotReject(() => waitForChildExit(child));
});
