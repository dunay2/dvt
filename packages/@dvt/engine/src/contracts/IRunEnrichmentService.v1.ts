/**
 * @file packages/@dvt/engine/src/contracts/IRunEnrichmentService.v1.ts
 * @baseline ADR-0015: getRunStatus Read Model Separation
 * @decision The enrichment boundary is explicit and separate from the engine facade
 * @consequence Callers can opt into provider-backed diagnostics without widening IWorkflowEngine
 * @version 1.0.0
 * @date 2026-04-11
 */
import type { EngineRunRef, RunStatusEnrichment } from './types.js';

export interface IRunEnrichmentService {
  getRunEnrichment(engineRunRef: EngineRunRef): Promise<RunStatusEnrichment>;
}
