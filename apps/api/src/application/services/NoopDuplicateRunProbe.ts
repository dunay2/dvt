import type { DuplicateRunProbe, DuplicateRunProbeResult } from '../ports/DuplicateRunProbe.js';

export class NoopDuplicateRunProbe implements DuplicateRunProbe {
  public async findExisting(_tenantId: string, _runId: string): Promise<DuplicateRunProbeResult> {
    return { kind: 'not_found' };
  }
}
