import { URL } from 'node:url';

import { encodeS3TenantPathSegment } from '@dvt/artifacts';
import type { RunExecutionContext, RunExecutionContextRef } from '@dvt/contracts';

import type { RunExecutionContextExpectedBinding } from '../../application/ports/runExecutionContextReferenceReader.js';

export function runExecutionContextMatchesBinding(
  context: RunExecutionContext,
  expected: RunExecutionContextExpectedBinding
): boolean {
  return (
    context.tenantId === expected.tenantId &&
    context.projectId === expected.projectId &&
    context.environmentId === expected.environmentId &&
    context.planId === expected.planId &&
    context.planVersion === expected.planVersion &&
    context.planSha256 === expected.planSha256 &&
    context.targetAdapter === expected.targetAdapter
  );
}

export function runExecutionContextRefMatchesS3Store(input: {
  readonly bucket: string;
  readonly tenantId: string;
  readonly ref: RunExecutionContextRef;
}): boolean {
  try {
    const uri = new URL(input.ref.uri);
    return (
      uri.protocol === 's3:' &&
      uri.hostname === input.bucket &&
      uri.pathname === `/tenants/${encodeS3TenantPathSegment(input.tenantId)}/${input.ref.sha256}`
    );
  } catch {
    return false;
  }
}

export function sameRunExecutionContextRef(
  left: RunExecutionContextRef,
  right: RunExecutionContextRef
): boolean {
  return (
    left.uri === right.uri &&
    left.sha256 === right.sha256 &&
    left.schemaVersion === right.schemaVersion &&
    left.planId === right.planId &&
    left.planVersion === right.planVersion &&
    left.pluginCompatibilityFingerprint === right.pluginCompatibilityFingerprint
  );
}
