/** Owned concern: derive deterministic integrity identities for dbt YAML description operations. */
import { createHash } from 'node:crypto';

import type {
  DbtProjectGraphProjection,
  DbtYamlDescriptionAnalysisReceipt,
  DbtYamlDescriptionEditProposal,
} from '@dvt/contracts';

import { DbtYamlDescriptionProposalMismatchError } from '../../ports/dbtYamlDescriptionEdit.js';
import type { WorkspaceStorageScope } from '../../ports/workspaceFiles.js';

export function assertProposalIntegrity(proposal: DbtYamlDescriptionEditProposal): void {
  if (
    sha256(proposal.candidateContent) !== proposal.candidateContentSha256 ||
    proposalDigest(proposal) !== proposal.proposalDigest
  ) {
    throw new DbtYamlDescriptionProposalMismatchError();
  }
}

export function proposalDigest(
  input: Readonly<
    Omit<
      DbtYamlDescriptionEditProposal,
      'schemaVersion' | 'candidateContent' | 'unifiedDiff' | 'proposalDigest'
    >
  >
): string {
  return sha256(
    canonicalJson({
      canvasId: input.canvasId,
      resource: input.resource,
      path: input.path,
      previousDescription: input.previousDescription,
      nextDescription: input.nextDescription,
      expectedContentSha256: input.expectedContentSha256,
      candidateContentSha256: input.candidateContentSha256,
    })
  );
}

export function operationRequestHash(
  operation: 'apply' | 'revert',
  scope: WorkspaceStorageScope,
  input: Readonly<Record<string, unknown>>
): string {
  return sha256(
    canonicalJson({
      operation,
      scope: {
        tenantId: scope.tenantId,
        projectId: scope.projectId,
        environmentId: scope.environmentId,
      },
      input,
    })
  );
}

export function operationReceiptId(operation: 'apply' | 'revert', requestHash: string): string {
  return sha256(canonicalJson({ operation, requestHash }));
}

export function batchIdempotencyKey(operation: 'apply' | 'revert', value: string): string {
  return `dbt-yaml-description-${operation}:${sha256(value)}`;
}

export function analysisReceipt(
  projection: DbtProjectGraphProjection,
  targetContentSha256: string
): DbtYamlDescriptionAnalysisReceipt {
  return {
    freshness: projection.freshness,
    analysisSha256: projection.analysisSha256,
    projectContentSetSha256: projection.projectRevision.contentSetSha256,
    targetContentSha256,
  };
}

export function buildFocusedUnifiedDiff(before: string, after: string, filePath: string): string {
  if (before === after) return '';
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  let prefix = 0;
  while (
    prefix < beforeLines.length &&
    prefix < afterLines.length &&
    beforeLines[prefix] === afterLines[prefix]
  ) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < beforeLines.length - prefix &&
    suffix < afterLines.length - prefix &&
    beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  const contextStart = Math.max(0, prefix - 2);
  const afterEnd = Math.min(afterLines.length, afterLines.length - suffix + 2);
  return [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    ...beforeLines.slice(contextStart, prefix).map((line) => ` ${line}`),
    ...beforeLines.slice(prefix, beforeLines.length - suffix).map((line) => `-${line}`),
    ...afterLines.slice(prefix, afterLines.length - suffix).map((line) => `+${line}`),
    ...afterLines.slice(afterLines.length - suffix, afterEnd).map((line) => ` ${line}`),
  ].join('\n');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalJsonValue(value));
}

function canonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalJsonValue(item));
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Integrity identities accept only canonical JSON values.');
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => [key, canonicalJsonValue(item)])
  );
}
