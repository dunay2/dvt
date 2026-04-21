import { asIsoUtcString } from '@dvt/contracts';

import type { ActivityDeps } from '../src/activities/stepActivities.js';
import type {
  IPlanFetcher,
  IPlanIntegrityValidator,
  RunStateCommandPort,
} from '../src/engine-types.js';

import { createExecutionPlan } from './helpers/contractFixtures.js';

const plan = createExecutionPlan({
  steps: [{ stepId: 's-1', kind: 'DBT_TEST', dependsOn: [] }],
});

const runStateCommandPort: RunStateCommandPort = {
  bootstrapRun: async () => ({ appended: [], deduped: [], lastSeq: 0 }),
  appendTransitions: async () => ({ appended: [], deduped: [], lastSeq: 0 }),
};

const fetcher: IPlanFetcher = {
  fetch: async () => ({
    bytes: new Uint8Array(),
    executionPolicy: {},
  }),
};

const integrity: IPlanIntegrityValidator = {
  fetchAndValidate: async () => ({
    plan,
    executionPolicy: {},
  }),
};

const validDeps: ActivityDeps = {
  runStateCommandPort,
  clock: {
    nowIsoUtc: () => asIsoUtcString('2026-04-20T00:00:00.000Z'),
  },
  idempotency: {
    eventId: () => 'evt-1',
    runEventKey: () => 'run-event-key',
    startRunIntentId: () => 'intent-1',
  },
  fetcher,
  integrity,
};

// @ts-expect-error Segment resolution dependencies are mandatory in ActivityDeps.
const invalidDeps: ActivityDeps = {
  runStateCommandPort,
  clock: {
    nowIsoUtc: () => asIsoUtcString('2026-04-20T00:00:00.000Z'),
  },
  idempotency: {
    eventId: () => 'evt-2',
    runEventKey: () => 'run-event-key-2',
    startRunIntentId: () => 'intent-2',
  },
};

void validDeps;
void invalidDeps;
