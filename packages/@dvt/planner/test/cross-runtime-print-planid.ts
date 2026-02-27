import { Planner } from '../src/domain/Planner.js';

import { FIXED_VECTOR } from './vectors/fixed-vector.inline.js';

async function main(): Promise<void> {
  const planner = new Planner();
  const { plan } = await planner.buildPlan(FIXED_VECTOR);
  // Output just the planId (single line) for bash comparison.
  // eslint-disable-next-line no-console
  console.log(plan.metadata.planId);
}

void main();
