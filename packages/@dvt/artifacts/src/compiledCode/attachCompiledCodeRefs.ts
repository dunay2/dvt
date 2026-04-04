import type { CompiledCodeRef, ExecutionPlan, ExecutionStepV1 } from '@dvt/contracts';
import { KNOWN_STEP_KINDS } from '@dvt/contracts';

import type { ICompiledCodeStorage } from '../ports/ICompiledCodeStorage.js';

import { computeSha256 } from './sha256.js';

export interface AttachCompiledCodeRefsOptions {
  /** Tenant owning this upload — enforces storage isolation (VIOLATION-3 / G-5). */
  tenantId: string;
  /** Map of stepId/nodeId to compiled SQL string (from run_results.json). */
  compiledCodeByNodeId: ReadonlyMap<string, string>;
  storage: ICompiledCodeStorage;
  /** Per-plan upload dedup cache: sha256 to storageUri. */
  uploadCache?: Map<string, string>;
  /**
   * Called when an upload fails. Fail-open: the step is returned unchanged.
   * Receives ArtifactStoreError (typed code) or generic Error — callers MUST branch
   * on error.code, never on error.message (G-2).
   * Defaults to no-op; wire IObservability at the call site for metrics.
   */
  onUploadFailure?: (stepId: string, error: Error) => void;
}

function canAttach(step: ExecutionStepV1): boolean {
  return step.kind === KNOWN_STEP_KINDS.DBT_MODEL || step.kind === KNOWN_STEP_KINDS.DBT_TEST;
}

/**
 * Enriches execution steps with compiledCodeRef after Planner.buildPlan() finishes.
 * Upload failures are fail-open: the step is returned unchanged.
 * All uploads are tenant-scoped — no cross-tenant namespace sharing.
 */
export async function attachCompiledCodeRefs(
  plan: ExecutionPlan,
  options: AttachCompiledCodeRefsOptions
): Promise<ExecutionPlan> {
  const { tenantId } = options;
  const uploadCache = options.uploadCache ?? new Map<string, string>();
  const onUploadFailure = options.onUploadFailure ?? (() => undefined);
  const inFlightUploads = new Map<string, Promise<string>>();

  async function resolveStorageUri(sha256: string, content: Buffer): Promise<string> {
    const cachedUri = uploadCache.get(sha256);
    if (cachedUri !== undefined) return cachedUri;

    const existingUpload = inFlightUploads.get(sha256);
    if (existingUpload !== undefined) return existingUpload;

    const nextUpload = options.storage.upload(tenantId, sha256, content).then((storageUri) => {
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
          stepTypeConfig: { ...step.stepTypeConfig, compiledCodeRef },
        };
      } catch (error) {
        onUploadFailure(step.stepId, error instanceof Error ? error : new Error(String(error)));
        return step;
      }
    })
  );

  return { ...plan, steps: updatedSteps };
}
