import { InvalidStateTransitionError } from '@dvt/run-domain';
import { expect, test } from 'vitest';

import { describeIfPg, withAdapter } from './helpers/postgresIntegrationHarness.js';
import { buildInvalidTransitionCases, makeBootstrap, rid } from './helpers/runEventFixtures.js';

describeIfPg('adapter-postgres transition guards (real PostgreSQL)', () => {
  const invalidTransitionCases = buildInvalidTransitionCases();

  for (const c of invalidTransitionCases) {
    test(c.name, () =>
      withAdapter(async (adapter) => {
        await adapter.bootstrapRunTx(makeBootstrap(c.runId));
        if (c.setup && c.setup.length > 0) {
          await adapter.appendAndEnqueueTx(rid(c.runId), c.setup);
        }

        await expect(
          adapter.appendAndEnqueueTx(rid(c.runId), [c.candidate])
        ).rejects.toBeInstanceOf(InvalidStateTransitionError);

        const events = await adapter.listEvents('t1', c.runId);
        const expectedLength = 1 + (c.setup?.length ?? 0);
        expect(events).toHaveLength(expectedLength);
      })
    );
  }
});
