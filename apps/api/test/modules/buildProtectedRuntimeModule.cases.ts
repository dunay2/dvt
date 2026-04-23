import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import type { FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';

import { buildProtectedRuntimeModule } from '../../src/modules/buildProtectedRuntimeModule.js';

const BUILD_PROTECTED_RUNTIME_MODULE_SOURCE = readFileSync(
  new URL('../../src/modules/buildProtectedRuntimeModule.ts', import.meta.url),
  'utf8'
);
const BUILD_PROTECTED_RUNTIME_STORAGE_SOURCE = readFileSync(
  new URL('../../src/modules/protectedRuntime/buildProtectedRuntimeStorage.ts', import.meta.url),
  'utf8'
);

/**
 * Focused cases for the protected runtime composition root.
 * The exported registrar keeps the historical `modules.test.ts` entrypoint
 * stable while letting this concern live in its own file.
 */
export function describeBuildProtectedRuntimeModuleCases(): void {
  describe('buildProtectedRuntimeModule', () => {
    it('fails fast without DATABASE_URL', async () => {
      const fakeApp = { log: { info() {}, warn() {}, error() {} } } as unknown as FastifyInstance;

      await expect(() =>
        buildProtectedRuntimeModule(fakeApp, {} as never, {} as never)
      ).rejects.toThrow(/DATABASE_URL is required when OIDC-protected runtime routes are enabled/);
    });

    it('wires an artifact-backed runExecutionContext resolver', () => {
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain(
        'const storageRuntime = buildProtectedRuntimeStorage({'
      );
      expect(BUILD_PROTECTED_RUNTIME_STORAGE_SOURCE).toContain(
        'new ArtifactBackedRunExecutionContextResolver'
      );
      expect(BUILD_PROTECTED_RUNTIME_STORAGE_SOURCE).toContain(
        'new ArtifactStoreDbtProjectBundleBindingPolicy'
      );
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain(
        'executablePlanResolver: storageRuntime.executablePlanResolver,'
      );
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain(
        'stepTypeRegistry: storageRuntime.stepTypeRegistry,'
      );
    });
  });
}
