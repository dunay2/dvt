import type { CompiledCodeRef } from '@dvt/contracts';

import {
  DBT_MODEL,
  DBT_TEST,
  type ExecutionPlanV2,
  type ExecutionStepV2,
} from '../domain/types.js';
import type { ICompiledCodeStorage } from '../ports/ICompiledCodeStorage.js';

import { computeSha256 } from './sha256.js';

export interface AttachCompiledCodeRefsOptions {
  /** Map of stepId/nodeId to compiled SQL string (from run_results.json). */
  compiledCodeByNodeId: ReadonlyMap<string, string>;
  storage: ICompiledCodeStorage;
  /** Per-plan upload dedup cache: sha256 to storageUri. */
  uploadCache?: Map<string, string>;
  /** Optional fail-open hook for upload failures. */
  onUploadFailure?: (stepId: string, error: unknown) => void;
}

function canAttach(step: ExecutionStepV2): boolean {
  return step.kind === DBT_MODEL || step.kind === DBT_TEST;
}

function metricUploadFailure(stepId: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn('dvt.planner.compiled_code_upload_failed_total', { stepId, message });
}

/**
 * Enriches execution steps with compiledCodeRef after Planner.buildPlan() finishes.
 * Upload failures are fail-open: the step remains unchanged.
 */
export async function attachCompiledCodeRefs(
  plan: ExecutionPlanV2,
  options: AttachCompiledCodeRefsOptions
): Promise<ExecutionPlanV2> {
  const uploadCache = options.uploadCache ?? new Map<string, string>();
  const onUploadFailure = options.onUploadFailure ?? metricUploadFailure;
  const inFlightUploads = new Map<string, Promise<string>>();

  async function resolveStorageUri(sha256: string, content: Buffer): Promise<string> {
    const cachedUri = uploadCache.get(sha256);
    if (cachedUri !== undefined) return cachedUri;

    const existingUpload = inFlightUploads.get(sha256);
    if (existingUpload !== undefined) {
      return existingUpload;
    }

    const nextUpload = options.storage.upload(sha256, content).then((storageUri) => {
      uploadCache.set(sha256, storageUri);
      return storageUri;
    });

    inFlightUploads.set(sha256, nextUpload);
    try {
      return await nextUpload;
    } finally {
      inFlightUploads.delete(sha256);
    }
  }

  const updatedSteps = await Promise.all(
    plan.steps.map(async (step) => {
      if (!canAttach(step)) return step;
      const compiledCode = options.compiledCodeByNodeId.get(step.stepId);
      if (compiledCode === undefined) return step;

      try {
        const content = Buffer.from(compiledCode, 'utf-8');
        const sha256 = computeSha256(content);
        const storageUri = await resolveStorageUri(sha256, content);
        const compiledCodeRef: CompiledCodeRef = {
          sha256,
          storageUri,
          sizeBytes: content.byteLength,
          encoding: 'utf-8',
        };
        return {
          ...step,
          stepTypeConfig: {
            ...(step.stepTypeConfig ?? {}),
            compiledCodeRef,
          },
        };
      } catch (error) {
        onUploadFailure(step.stepId, error);
        return step;
      }
    })
  );

  return {
    ...plan,
    steps: updatedSteps,
  };
}
