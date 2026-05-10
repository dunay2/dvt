/**
 * @file packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts
 * @ownedConcern Define the engine port for validating scoped plan artifacts before dispatch.
 * @baseline ADR-0043: Plan record, plan store, and artifacts ownership
 * @baseline ADR-0054: Plan Store Scoped Record Identity
 * @decision Keep scoped plan artifact integrity validation as an engine-owned dispatch port.
 * @consequence Engine applications validate scoped artifacts before provider dispatch without
 *   owning artifact storage semantics.
 * @version 1.0.0
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import type { ExecutionPlan, RunExecutionPolicy, ScopedPlanRef } from '@dvt/contracts';

export interface IPlanIntegrityValidator {
  fetchAndValidate(
    input: ScopedPlanRef,
    fetcher: IStoredPlanArtifactReader
  ): Promise<{ plan: ExecutionPlan; executionPolicy: RunExecutionPolicy }>;
}
