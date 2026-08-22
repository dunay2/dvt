#!/usr/bin/env node
/** Owned concern: run the public HET2 HTTPS JSON -> artifact -> PostgreSQL -> DBT proof. */
const { spawn, spawnSync } = require('node:child_process');
const { readFile } = require('node:fs/promises');
const { createServer } = require('node:https');
const path = require('node:path');
const { sha256Hex } = require('@dvt/crypto');

const { allocateFreePort } = require('./run-dev-stack.temporal.cjs');

const MINIO_IMAGE =
  'minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e';
const MINIO_ACCESS_KEY_ID = 'minioadmin';
const MINIO_SECRET_ACCESS_KEY = 'minioadmin';
const S3_REGION = 'us-east-1';
const FIXTURE_TOKEN = 'het2-fixture-bearer-token';
const FIXTURE_ROOT = path.resolve(__dirname, '../apps/web/cypress/fixtures');
const FIXTURE_PATH = path.join(FIXTURE_ROOT, 'het2-http-json-orders.jsonl');
const FIXTURE_MANIFEST_PATH = path.join(FIXTURE_ROOT, 'het2-http-json-orders.manifest.json');
const FIXTURE_CERT_PATH = path.join(FIXTURE_ROOT, 'het2-fixture-cert.pem');
const FIXTURE_KEY_PATH = path.join(FIXTURE_ROOT, 'het2-fixture-key.pem');
const SELECTED_CLOSURE_RUNNER = 'scripts/run-selected-closure-live-proof.cjs';
const HET2_CYPRESS_SPEC = 'apps/web/cypress/e2e/canvas/canvas-het2-rest-artifact-dbt-live.cy.ts';

function validateHttpJsonFixture(content, manifest) {
  const sha256 = sha256Hex(content);
  if (content.byteLength !== manifest.sizeBytes) {
    throw new Error(
      `HET2 fixture size does not match the manifest: expected ${manifest.sizeBytes}, received ${content.byteLength}.`
    );
  }
  if (sha256 !== manifest.sha256) {
    throw new Error(
      `HET2 fixture SHA-256 does not match the manifest: expected ${manifest.sha256}, received ${sha256}.`
    );
  }
  if (manifest.objectKey !== `tenants/tenant/${sha256}`) {
    throw new Error('HET2 object key must be the tenant-scoped content hash.');
  }
  if (manifest.storageUri !== `s3://${manifest.bucket}/${manifest.objectKey}`) {
    throw new Error('HET2 storage URI must identify the manifest bucket and object key.');
  }
  return manifest;
}

function buildMinioDockerArgs({ containerName, port }) {
  return [
    'run',
    '--detach',
    '--rm',
    '--name',
    containerName,
    '--publish',
    `127.0.0.1:${port}:9000`,
    '--env',
    `MINIO_ROOT_USER=${MINIO_ACCESS_KEY_ID}`,
    '--env',
    `MINIO_ROOT_PASSWORD=${MINIO_SECRET_ACCESS_KEY}`,
    MINIO_IMAGE,
    'server',
    '/data',
    '--console-address',
    ':9001',
  ];
}

function buildHet2Env({ minioEndpoint, fixtureEndpoint, manifest, sourceEnv = process.env }) {
  const fixtureOrigin = new URL(fixtureEndpoint).origin;
  return {
    ...sourceEnv,
    DVT_TEMPORAL_HTTP_JSON_ENABLED: 'true',
    DVT_HTTP_JSON_ENDPOINTS: JSON.stringify({
      [manifest.endpointRef]: `${fixtureOrigin}/orders`,
      'http-endpoint:het2-status-failure': `${fixtureOrigin}/status-failure`,
      'http-endpoint:het2-integrity-mismatch': `${fixtureOrigin}/integrity-mismatch`,
      'http-endpoint:het2-timeout': `${fixtureOrigin}/timeout`,
      'http-endpoint:het2-slow-once': `${fixtureOrigin}/slow-once`,
    }),
    DVT_HTTP_JSON_AUTH_TOKENS: JSON.stringify({
      [manifest.authCredentialRef]: FIXTURE_TOKEN,
    }),
    DVT_HTTP_JSON_ARTIFACT_CREDENTIAL_REF: manifest.artifactCredentialRef,
    DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE: 'true',
    DVT_HTTP_JSON_CA_FILE: FIXTURE_CERT_PATH,
    DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: 'true',
    DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: manifest.artifactCredentialRef,
    DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: manifest.targetCredentialRef,
    DVT_OBJECT_FILE_S3_ENDPOINT: minioEndpoint,
    DVT_OBJECT_FILE_S3_REGION: S3_REGION,
    DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: 'true',
    AWS_ACCESS_KEY_ID: MINIO_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: MINIO_SECRET_ACCESS_KEY,
    AWS_REGION: S3_REGION,
  };
}

function buildSelectedClosureArgs() {
  return [SELECTED_CLOSURE_RUNNER, '--spec', HET2_CYPRESS_SPEC];
}

function runDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Docker command failed with exit code ${result.status}: ${String(result.stderr).trim()}`
    );
  }
  return String(result.stdout).trim();
}

async function waitForMinio(endpoint, timeoutMs = 120_000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${endpoint}/minio/health/live`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) return;
      lastError = new Error(`MinIO health endpoint responded with ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `MinIO did not become ready within ${timeoutMs}ms: ${
      lastError instanceof Error ? lastError.message : 'unknown error'
    }`
  );
}

function loadS3Module() {
  const entry = require.resolve('@aws-sdk/client-s3', {
    paths: [path.resolve(__dirname, '../apps/temporal-worker')],
  });
  return require(entry);
}

async function createArtifactBucket({ endpoint, bucket }) {
  const { CreateBucketCommand, S3Client } = loadS3Module();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const client = new S3Client({
    endpoint,
    region: S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY_ID,
      secretAccessKey: MINIO_SECRET_ACCESS_KEY,
    },
  });
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }), {
      abortSignal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    client.destroy();
  }
}

async function startHttpsFixture({ content, cert, key, port }) {
  let slowRequestCount = 0;
  const mismatchedContent = Buffer.from(content.toString('utf8').replace('10.25', '99.99'));
  const server = createServer({ cert, key }, (request, response) => {
    const respondWithContent = (body = content) => {
      response.writeHead(200, {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'content-length': body.byteLength,
        'cache-control': 'no-store',
      });
      response.end(body);
    };
    if (
      request.method !== 'GET' ||
      !['/orders', '/status-failure', '/integrity-mismatch', '/timeout', '/slow-once'].includes(
        request.url
      )
    ) {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end('{"error":"not_found"}');
      return;
    }
    if (request.headers.authorization !== `Bearer ${FIXTURE_TOKEN}`) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end('{"error":"unauthorized"}');
      return;
    }
    if (request.url === '/status-failure') {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end('{"error":"controlled_unavailable"}');
      return;
    }
    if (request.url === '/integrity-mismatch') {
      respondWithContent(mismatchedContent);
      return;
    }
    if (request.url === '/timeout') {
      const timer = setTimeout(respondWithContent, 25_000);
      response.once('close', () => clearTimeout(timer));
      return;
    }
    if (request.url === '/slow-once' && slowRequestCount++ === 0) {
      const timer = setTimeout(respondWithContent, 15_000);
      response.once('close', () => clearTimeout(timer));
      return;
    }
    respondWithContent();
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

function closeServer(server) {
  return new Promise((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  );
}

function waitForChildExit(child) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const resolveExit = (code, signal) => {
      if (settled) return;
      settled = true;
      if (signal !== null) {
        reject(new Error(`HET2 selected-closure proof exited from signal ${signal}.`));
        return;
      }
      resolve(code);
    };
    child.once('error', reject);
    child.once('exit', resolveExit);
    if (child.exitCode !== null) queueMicrotask(() => resolveExit(child.exitCode, null));
  });
}

async function runSelectedClosure(env) {
  const child = spawn(process.execPath, buildSelectedClosureArgs(), {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  const exitCode = await waitForChildExit(child);
  if (exitCode !== 0) {
    throw new Error(`HET2 selected-closure proof failed with exit code ${exitCode}.`);
  }
}

async function main() {
  const [content, manifestJson, cert, key] = await Promise.all([
    readFile(FIXTURE_PATH),
    readFile(FIXTURE_MANIFEST_PATH, 'utf8'),
    readFile(FIXTURE_CERT_PATH),
    readFile(FIXTURE_KEY_PATH),
  ]);
  const manifest = validateHttpJsonFixture(content, JSON.parse(manifestJson));
  const [minioPort, fixturePort] = await Promise.all([allocateFreePort(), allocateFreePort()]);
  const minioEndpoint = `http://127.0.0.1:${minioPort}`;
  const fixtureEndpoint = `https://127.0.0.1:${fixturePort}/orders`;
  const containerName = `dvt-het2-public-proof-${process.pid}-${Date.now()}`;
  let minioStarted = false;
  let fixtureServer;

  try {
    console.log(`[het2-public-live] Starting pinned MinIO at ${minioEndpoint}`);
    runDocker(buildMinioDockerArgs({ containerName, port: minioPort }));
    minioStarted = true;
    await waitForMinio(minioEndpoint);
    await createArtifactBucket({ endpoint: minioEndpoint, bucket: manifest.bucket });
    fixtureServer = await startHttpsFixture({ content, cert, key, port: fixturePort });
    console.log('[het2-public-live] Empty artifact bucket and HTTPS fixture ready');
    await runSelectedClosure(buildHet2Env({ minioEndpoint, fixtureEndpoint, manifest }));
  } finally {
    if (fixtureServer !== undefined) await closeServer(fixtureServer);
    if (minioStarted) runDocker(['rm', '--force', containerName], { stdio: 'ignore' });
  }
}

module.exports = {
  buildHet2Env,
  buildMinioDockerArgs,
  buildSelectedClosureArgs,
  startHttpsFixture,
  validateHttpJsonFixture,
  waitForChildExit,
};

if (require.main === module) {
  const keepAlive = setInterval(() => undefined, 1_000);
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => clearInterval(keepAlive));
}
