const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { EventEmitter } = require('node:events');
const path = require('node:path');

const {
  buildHet1ObjectFileEnv,
  buildMinioDockerArgs,
  buildSelectedClosureArgs,
  waitForChildExit,
  validateObjectFileFixture,
} = require('./run-het1-public-vertical-live-proof.cjs');

const fixtureRoot = path.resolve(__dirname, '../apps/web/cypress/fixtures');
const fixtureContent = readFileSync(path.join(fixtureRoot, 'het1-object-file-orders.csv'));
const fixtureManifest = JSON.parse(
  readFileSync(path.join(fixtureRoot, 'het1-object-file-orders.manifest.json'), 'utf8')
);

test('pins HET1 CSV fixture bytes to LF in every checkout', () => {
  const attributes = readFileSync(path.resolve(__dirname, '../.gitattributes'), 'utf8');
  assert.match(attributes, /^apps\/web\/cypress\/fixtures\/\*\.csv text eol=lf$/mu);
});

test('validates the content-addressed HET1 fixture before infrastructure startup', () => {
  assert.deepEqual(validateObjectFileFixture(fixtureContent, fixtureManifest), fixtureManifest);

  assert.throws(
    () => validateObjectFileFixture(Buffer.from('changed', 'utf8'), fixtureManifest),
    /fixture size does not match the manifest/
  );
  assert.throws(
    () =>
      validateObjectFileFixture(fixtureContent, {
        ...fixtureManifest,
        objectKey: 'tenants/tenant/not-the-content-hash',
      }),
    /object key must end with the fixture SHA-256/
  );
  assert.throws(
    () =>
      validateObjectFileFixture(fixtureContent, {
        ...fixtureManifest,
        integrityMismatchObject: {
          ...fixtureManifest.integrityMismatchObject,
          sha256: fixtureManifest.sha256,
        },
      }),
    /integrity-mismatch object must declare a distinct content-addressed key/
  );
});

test('starts the pinned MinIO image on loopback only', () => {
  assert.deepEqual(
    buildMinioDockerArgs({
      containerName: 'dvt-het1-proof-123',
      port: 19000,
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    }),
    [
      'run',
      '--detach',
      '--rm',
      '--name',
      'dvt-het1-proof-123',
      '--publish',
      '127.0.0.1:19000:9000',
      '--env',
      'MINIO_ROOT_USER=minioadmin',
      '--env',
      'MINIO_ROOT_PASSWORD=minioadmin',
      'minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e',
      'server',
      '/data',
      '--console-address',
      ':9001',
    ]
  );
});

test('enables the real object-file adapter for API admission and worker execution', () => {
  assert.deepEqual(
    buildHet1ObjectFileEnv({
      endpoint: 'http://127.0.0.1:19000',
      manifest: fixtureManifest,
      sourceEnv: { EXISTING: 'kept' },
    }),
    {
      EXISTING: 'kept',
      DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: 'true',
      DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: 'object-store:het1-source',
      DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: 'postgres:het1-staging',
      DVT_OBJECT_FILE_S3_ENDPOINT: 'http://127.0.0.1:19000',
      DVT_OBJECT_FILE_S3_REGION: 'us-east-1',
      DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: 'true',
      AWS_ACCESS_KEY_ID: 'minioadmin',
      AWS_SECRET_ACCESS_KEY: 'minioadmin',
      AWS_REGION: 'us-east-1',
    }
  );
});

test('delegates the stack to one public HET1 Cypress spec', () => {
  assert.deepEqual(buildSelectedClosureArgs(), [
    'scripts/run-selected-closure-live-proof.cjs',
    '--spec',
    'apps/web/cypress/e2e/canvas/canvas-het1-object-file-dbt-live.cy.ts',
  ]);
});

test('observes a selected-closure process that already exited', async () => {
  const child = new EventEmitter();
  child.exitCode = 0;

  await assert.doesNotReject(() => waitForChildExit(child));
});
