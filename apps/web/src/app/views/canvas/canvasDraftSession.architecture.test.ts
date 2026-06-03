import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const DRAFT_SESSION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftSession.ts'
);

describe('canvasDraftSession architecture', () => {
  it('exposes a namespaced component API over baseline, machine, and working-set seams', () => {
    expect(DRAFT_SESSION_SOURCE).toContain("'./canvasDraftSessionBaseline'");
    expect(DRAFT_SESSION_SOURCE).toContain("'./canvasDraftSessionMachine'");
    expect(DRAFT_SESSION_SOURCE).toContain("'./canvasDraftSessionWorkingSet'");
    expect(DRAFT_SESSION_SOURCE).toContain('export const canvasDraftSession = {');
    expect(DRAFT_SESSION_SOURCE).toContain('baseline: canvasDraftSessionBaseline');
    expect(DRAFT_SESSION_SOURCE).toContain('machine: canvasDraftSessionMachine');
    expect(DRAFT_SESSION_SOURCE).toContain('workingSet: canvasDraftSessionWorkingSet');
    expect(DRAFT_SESSION_SOURCE).not.toContain('export {');
  });
});
