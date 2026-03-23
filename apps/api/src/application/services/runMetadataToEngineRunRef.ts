import type { EngineRunRef } from '@dvt/contracts';
import type { RunMetadata } from '@dvt/contracts';

export function runMetadataToEngineRunRef(metadata: RunMetadata): EngineRunRef {
  if (metadata.provider === 'temporal') {
    return {
      provider: 'temporal',
      tenantId: metadata.tenantId,
      namespace: metadata.providerNamespace ?? 'default',
      workflowId: metadata.providerWorkflowId,
      runId: metadata.providerRunId,
      ...(metadata.providerTaskQueue ? { taskQueue: metadata.providerTaskQueue } : {}),
    };
  }

  if (metadata.provider === 'conductor') {
    return {
      provider: 'conductor',
      tenantId: metadata.tenantId,
      workflowId: metadata.providerWorkflowId,
      runId: metadata.providerRunId,
      conductorUrl: metadata.providerConductorUrl ?? '',
    };
  }

  return {
    provider: 'mock',
    tenantId: metadata.tenantId,
    workflowId: metadata.providerWorkflowId,
    runId: metadata.providerRunId,
  };
}
