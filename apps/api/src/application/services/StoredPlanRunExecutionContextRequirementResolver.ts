/** Owned concern: resolve execution-context requirements from canonical stored plans. */
import type { IPlanStoreReader } from '@dvt/artifacts';
import { parseExecutionPlan } from '@dvt/contracts';
import {
  selectRunExecutionContextPluginRequirements,
  type IRunExecutionContextBindingPolicy,
} from '@dvt/engine';

import type {
  IRunExecutionContextRequirementResolver,
  RunExecutionContextRequirement,
} from '../ports/runExecutionContextRequirementResolver.js';

export class StoredPlanRunExecutionContextRequirementResolver implements IRunExecutionContextRequirementResolver {
  public constructor(
    private readonly planStore: Pick<IPlanStoreReader, 'getPlanRecord'>,
    private readonly bindingPolicy: IRunExecutionContextBindingPolicy
  ) {}

  public async resolve(
    metadata: Parameters<IRunExecutionContextRequirementResolver['resolve']>[0]
  ): Promise<RunExecutionContextRequirement> {
    try {
      const record = await this.planStore.getPlanRecord(metadata);
      if (record === undefined) return 'unknown';

      const plan = parseExecutionPlan(JSON.parse(record.canonicalPlanJson));
      return selectRunExecutionContextPluginRequirements(plan, this.bindingPolicy).length > 0
        ? 'required'
        : 'not_required';
    } catch {
      return 'unknown';
    }
  }
}
