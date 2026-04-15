import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import {
  buildCanonicalDbtProjectBundleRelativePath,
  getDbtProjectBundleLocatorValidationError,
  type DbtProjectBundleRef,
} from '@dvt/contracts';

import { ArtifactReadError } from './ArtifactReadError.js';

export type DbtProjectBundleArtifactStore =
  | {
      readonly kind: 's3';
      readonly bucket: string;
    }
  | {
      readonly kind: 'file';
      readonly rootPath: string;
    };

export function assertDbtProjectBundleBinding(args: {
  projectBundleRef: DbtProjectBundleRef;
  expectedTenantId: string;
  bundleStore: DbtProjectBundleArtifactStore | undefined;
}): void {
  const { projectBundleRef, expectedTenantId, bundleStore } = args;

  assertTenantId(projectBundleRef.tenantId, expectedTenantId);
  assertCanonicalLocator(projectBundleRef, expectedTenantId);
  assertBoundToConfiguredStore(projectBundleRef, expectedTenantId, bundleStore);
}

function assertBoundToConfiguredStore(
  projectBundleRef: DbtProjectBundleRef,
  expectedTenantId: string,
  bundleStore: DbtProjectBundleArtifactStore | undefined
): void {
  if (bundleStore === undefined) {
    throw new ArtifactReadError(
      'ARTIFACT_STORE_MISMATCH',
      'dbt project bundle artifact store is not configured'
    );
  }

  let parsedUri: URL;
  try {
    parsedUri = new URL(projectBundleRef.uri);
  } catch {
    throw new ArtifactReadError(
      'ARTIFACT_URI_INVALID',
      'dbt project bundle artifact locator is invalid'
    );
  }

  const scheme = parsedUri.protocol.replace(/:$/, '').toLowerCase();
  if (bundleStore.kind === 's3') {
    if (scheme !== 's3') {
      throw new ArtifactReadError(
        'ARTIFACT_STORE_MISMATCH',
        `dbt project bundle artifact store mismatch: expected scheme=s3 actual=${scheme}`
      );
    }

    if (parsedUri.hostname !== bundleStore.bucket) {
      throw new ArtifactReadError(
        'ARTIFACT_STORE_MISMATCH',
        `dbt project bundle artifact bucket mismatch: expected=${bundleStore.bucket} actual=${parsedUri.hostname}`
      );
    }

    return;
  }

  if (scheme !== 'file') {
    throw new ArtifactReadError(
      'ARTIFACT_STORE_MISMATCH',
      `dbt project bundle artifact store mismatch: expected scheme=file actual=${scheme}`
    );
  }

  const expectedPath = resolve(
    bundleStore.rootPath,
    buildCanonicalDbtProjectBundleRelativePath(expectedTenantId, projectBundleRef.sha256)
  );
  const actualPath = resolve(fileURLToPath(parsedUri));
  if (actualPath !== expectedPath) {
    throw new ArtifactReadError(
      'ARTIFACT_STORE_MISMATCH',
      `dbt project bundle artifact path mismatch: expected=${expectedPath} actual=${actualPath}`
    );
  }
}

function assertTenantId(actualTenantId: string, expectedTenantId: string): void {
  if (actualTenantId !== expectedTenantId) {
    throw new ArtifactReadError(
      'ARTIFACT_TENANT_MISMATCH',
      `dbt project bundle artifact tenant mismatch: expected=${expectedTenantId} actual=${actualTenantId}`
    );
  }
}

function assertCanonicalLocator(
  projectBundleRef: DbtProjectBundleRef,
  expectedTenantId: string
): void {
  const locatorError = getDbtProjectBundleLocatorValidationError(
    projectBundleRef.uri,
    expectedTenantId,
    projectBundleRef.sha256
  );
  if (locatorError !== undefined) {
    throw new ArtifactReadError('ARTIFACT_URI_LOCATOR_INVALID', locatorError);
  }
}
