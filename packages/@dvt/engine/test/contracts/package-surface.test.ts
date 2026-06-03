import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

type EnginePackageJson = {
  exports?: Record<string, unknown>;
};

function readEnginePackageJson(): EnginePackageJson {
  const packageJsonPath = join(import.meta.dirname, '../../package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as EnginePackageJson;
}

function readEngineSource(relPath: string): string {
  return readFileSync(join(import.meta.dirname, '../../src', relPath), 'utf8');
}

describe('@dvt/engine package surface', () => {
  it('publishes IWorkflowEngine through the root package only', () => {
    const packageJson = readEnginePackageJson();

    expect(packageJson.exports).toBeDefined();
    expect(packageJson.exports).toHaveProperty('.');
    expect(packageJson.exports).not.toHaveProperty('./contracts/engine/*');
  });

  it('hard-cuts IWorkflowEngine to the ports folder with no contract-file alias', () => {
    const portsPath = join(import.meta.dirname, '../../src/ports/IWorkflowEngine.ts');
    const legacyContractsPath = join(
      import.meta.dirname,
      '../../src/contracts/IWorkflowEngine.v1.ts'
    );

    expect(existsSync(portsPath)).toBe(true);
    expect(existsSync(legacyContractsPath)).toBe(false);
    expect(readEngineSource('index.ts')).toContain("export * from './ports/IWorkflowEngine.js';");
    expect(readEngineSource('contracts/engine/index.ts')).not.toContain('IWorkflowEngine');
  });
});
