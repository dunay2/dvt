import { readFileSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const runtimeSourcePath = fileURLToPath(
  new URL('../../src/lineage/LineageWorkerRuntime.ts', import.meta.url)
);

describe('LineageWorkerRuntime architecture', () => {
  it('keeps the public runtime as a facade over loop and tick collaborators', () => {
    const source = readFileSync(runtimeSourcePath, 'utf8');

    expect(source).toContain('./runtime/LineageWorkerLoopController.js');
    expect(source).toContain('./runtime/lineageWorkerTick.js');
    expect(source).not.toContain('lineageWorkerRecordProcessor');
    expect(source).not.toContain('lineageWorkerDeadLetterSupport');
    expect(source).not.toMatch(/\bprivate\s+async\s+runLoop\b/);
    expect(source).not.toMatch(/\bprivate\s+async\s+runLoopIteration\b/);
    expect(source).not.toMatch(/\bprivate\s+async\s+wait\b/);
  });
});
