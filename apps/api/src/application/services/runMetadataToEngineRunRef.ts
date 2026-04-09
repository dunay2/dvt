import type { EngineRunRef } from '@dvt/contracts';
import type { RunMetadata } from '@dvt/contracts';

export function runMetadataToEngineRunRef(metadata: RunMetadata): EngineRunRef {
  return metadata.providerRef;
}
