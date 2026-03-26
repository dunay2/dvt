import {
  DUPLICATE_RUN_PROBE_KIND,
  type DuplicateRunProbe,
  type DuplicateRunProbeResult,
} from '../ports/DuplicateRunProbe.js';

export class NoopDuplicateRunProbe implements DuplicateRunProbe {
  public async findExisting(_tenantId: string, _runId: string): Promise<DuplicateRunProbeResult> {
    return { kind: DUPLICATE_RUN_PROBE_KIND.notFound };
  }
}
