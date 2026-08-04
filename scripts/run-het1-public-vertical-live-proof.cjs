#!/usr/bin/env node
/** Owned concern: provide the real content-addressed object required by the public HET1 proof. */
const { spawn, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { allocateFreePort } = require('./run-dev-stack.temporal.cjs');

const MINIO_IMAGE =
  'minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e';
const MINIO_ACCESS_KEY_ID = 'minioadmin';
const MINIO_SECRET_ACCESS_KEY = 'minioadmin';
const S3_REGION = 'us-east-1';
const FIXTURE_PATH = path.resolve(
  __dirname,
  '../apps/web/cypress/fixtures/het1-object-file-orders.csv'
);
const FIXTURE_MANIFEST_PATH = path.resolve(
  __dirname,
  '../apps/web/cypress/fixtures/het1-object-file-orders.manifest.json'
);
const SELECTED_CLOSURE_RUNNER = 'scripts/run-selected-closure-live-proof.cjs';
const HET1_CYPRESS_SPEC = 'apps/web/cypress/e2e/canvas/canvas-het1-object-file-dbt-live.cy.ts';

function validateObjectFileFixture(content, manifest) {
  const sha256 = createHash('sha256').update(content).digest('hex');

  if (content.byteLength !== manifest.sizeBytes) {
    throw new Error(
      `HET1 fixture size does not match the manifest: expected ${manifest.sizeBytes}, received ${content.byteLength}.`
    );
  }
  if (sha256 !== manifest.sha256) {
    throw new Error(
      `HET1 fixture SHA-256 does not match the manifest: expected ${manifest.sha256}, received ${sha256}.`
    );
  }
  if (!manifest.objectKey.endsWith(`/${sha256}`)) {
    throw new Error('HET1 object key must end with the fixture SHA-256.');
  }
  if (manifest.storageUri !== `s3://${manifest.bucket}/${manifest.objectKey}`) {
    throw new Error('HET1 storage URI must identify the manifest bucket and object key.');
  }

  return manifest;
}

function buildMinioDockerArgs({ containerName, port, accessKeyId, secretAccessKey }) {
  return [
    'run',
    '--detach',
    '--rm',
    '--name',
    containerName,
    '--publish',
    `127.0.0.1:${port}:9000`,
    '--env',
    `MINIO_ROOT_USER=${accessKeyId}`,
    '--env',
    `MINIO_ROOT_PASSWORD=${secretAccessKey}`,
    MINIO_IMAGE,
    'server',
    '/data',
    '--console-address',
    ':9001',
  ];
}

function buildHet1ObjectFileEnv({ endpoint, manifest, sourceEnv = process.env }) {
  return {
    ...sourceEnv,
    DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: 'true',
    DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: manifest.sourceCredentialRef,
    DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: manifest.targetCredentialRef,
    DVT_OBJECT_FILE_S3_ENDPOINT: endpoint,
    DVT_OBJECT_FILE_S3_REGION: S3_REGION,
    DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: 'true',
    AWS_ACCESS_KEY_ID: MINIO_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: MINIO_SECRET_ACCESS_KEY,
    AWS_REGION: S3_REGION,
  };
}

function buildSelectedClosureArgs() {
  return [SELECTED_CLOSURE_RUNNER, '--spec', HET1_CYPRESS_SPEC];
}

function runDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }
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
      const response = await fetch(`${endpoint}/minio/health/live`);
      if (response.ok) {
        return;
      }
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

async function loadS3Module() {
  const entry = require.resolve('@aws-sdk/client-s3', {
    paths: [path.resolve(__dirname, '../apps/temporal-worker')],
  });
  return import(pathToFileURL(entry).href);
}

async function uploadFixture({ endpoint, manifest, content }) {
  const { CreateBucketCommand, PutObjectCommand, S3Client } = await loadS3Module();
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
    await client.send(new CreateBucketCommand({ Bucket: manifest.bucket }));
    await client.send(
      new PutObjectCommand({
        Bucket: manifest.bucket,
        Key: manifest.objectKey,
        Body: content,
        ContentType: 'text/csv',
        Metadata: { sha256: manifest.sha256 },
      })
    );
  } finally {
    client.destroy();
  }
}

async function runSelectedClosure(env) {
  const child = spawn(process.execPath, buildSelectedClosureArgs(), {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal !== null) {
        reject(new Error(`HET1 selected-closure proof exited from signal ${signal}.`));
        return;
      }
      resolve(code);
    });
  });

  if (exitCode !== 0) {
    throw new Error(`HET1 selected-closure proof failed with exit code ${exitCode}.`);
  }
}

async function main() {
  const [content, manifestJson] = await Promise.all([
    readFile(FIXTURE_PATH),
    readFile(FIXTURE_MANIFEST_PATH, 'utf8'),
  ]);
  const manifest = validateObjectFileFixture(content, JSON.parse(manifestJson));
  const port = await allocateFreePort();
  const endpoint = `http://127.0.0.1:${port}`;
  const containerName = `dvt-het1-public-proof-${process.pid}-${Date.now()}`;
  let minioStarted = false;

  try {
    runDocker(
      buildMinioDockerArgs({
        containerName,
        port,
        accessKeyId: MINIO_ACCESS_KEY_ID,
        secretAccessKey: MINIO_SECRET_ACCESS_KEY,
      })
    );
    minioStarted = true;
    await waitForMinio(endpoint);
    await uploadFixture({ endpoint, manifest, content });
    await runSelectedClosure(buildHet1ObjectFileEnv({ endpoint, manifest }));
  } finally {
    if (minioStarted) {
      runDocker(['rm', '--force', containerName], { stdio: 'ignore' });
    }
  }
}

module.exports = {
  buildHet1ObjectFileEnv,
  buildMinioDockerArgs,
  buildSelectedClosureArgs,
  validateObjectFileFixture,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
