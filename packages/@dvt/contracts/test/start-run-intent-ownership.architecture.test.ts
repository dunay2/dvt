import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('start-run intent ownership', () => {
  it('keeps behavioral intent ports and policy out of @dvt/contracts', () => {
    expect(
      existsSync(
        resolve(repoRoot, 'packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts')
      )
    ).toBe(false);
    expect(
      existsSync(
        resolve(repoRoot, 'packages/@dvt/contracts/src/contracts/engine/StartRunIntentPolicy.v1.ts')
      )
    ).toBe(false);
  });

  it('documents engine as the only canonical owner of the intent store behavior port', () => {
    const engineContractsIndex = readFile('docs/contracts/engine/index.md');
    const contractRootIndex = readFile('packages/@dvt/contracts/src/index.ts');
    const engineRootIndex = readFile('packages/@dvt/engine/src/index.ts');

    expect(engineContractsIndex).not.toContain('IStartRunIntentStore.v1.ts');
    expect(engineContractsIndex).not.toContain('StartRunIntentPolicy.v1.ts');
    expect(engineContractsIndex).toContain(
      'packages/@dvt/engine/src/ports/IStartRunIntentStore.ts'
    );
    expect(engineContractsIndex).toContain(
      'packages/@dvt/engine/src/domain/startRunIntentPolicy.ts'
    );
    expect(contractRootIndex).not.toContain('IStartRunIntentStore.v1.js');
    expect(contractRootIndex).not.toContain('StartRunIntentPolicy.v1.js');
    expect(engineRootIndex).toContain('./ports/IStartRunIntentStore.js');
  });
});

function readFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}
