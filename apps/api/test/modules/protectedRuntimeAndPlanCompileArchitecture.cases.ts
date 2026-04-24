import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { describe, expect, it } from 'vitest';

const BUILD_PROTECTED_RUNTIME_MODULE_SOURCE = readFileSync(
  new URL('../../src/modules/buildProtectedRuntimeModule.ts', import.meta.url),
  'utf8'
);
const BUILD_PROTECTED_START_RUN_RUNTIME_SOURCE = readFileSync(
  new URL('../../src/modules/startRun/buildProtectedStartRunRuntime.ts', import.meta.url),
  'utf8'
);
const BUILD_PROTECTED_RUNTIME_STORAGE_SOURCE = readFileSync(
  new URL('../../src/modules/protectedRuntime/buildProtectedRuntimeStorage.ts', import.meta.url),
  'utf8'
);
const PLAN_COMPILE_BOUNDARY_SOURCE = readFileSync(
  new URL('../../src/modules/planCompileBoundary.ts', import.meta.url),
  'utf8'
);
const APP_SOURCE = readFileSync(new URL('../../src/app.ts', import.meta.url), 'utf8');
const START_RUN_TARGET_ADAPTER_REGISTRY_SOURCE = readFileSync(
  new URL('../../src/application/services/startRunTargetAdapterRegistry.ts', import.meta.url),
  'utf8'
);

/**
 * Architecture cases for the protected-runtime and plan-compile component.
 * These assertions validate semantic ownership and truth alignment across the
 * component, not just whether a barrel stays thin.
 */
export function describeProtectedRuntimeAndPlanCompileArchitectureCases(): void {
  describe('protected runtime and plan compile architecture', () => {
    it('keeps the protected runtime root explicit while delegating start-run assembly to its subcomponent', () => {
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain(
        'const storageRuntime = buildProtectedRuntimeStorage({'
      );
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain(
        'const executionRuntime = await buildProtectedExecutionRuntime({'
      );
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain(
        'const startRunRuntime = buildProtectedStartRunRuntime({'
      );
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).not.toContain(
        'const executablePlanResolver = new StoredExecutablePlanResolver({'
      );
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).not.toContain(
        'const planValidator = new StoredPlanExecutabilityValidator({'
      );
      expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).not.toContain(
        'const planCompilePlanner = buildPlanCompilePlanner();'
      );
      expect(BUILD_PROTECTED_RUNTIME_STORAGE_SOURCE).toContain(
        'const executablePlanResolver = new StoredExecutablePlanResolver({'
      );
      expect(BUILD_PROTECTED_START_RUN_RUNTIME_SOURCE).toContain(
        'const planValidator = new StoredPlanExecutabilityValidator({'
      );
      expect(BUILD_PROTECTED_START_RUN_RUNTIME_SOURCE).toContain(
        'const planCompilePlanner = buildPlanCompilePlanner();'
      );
    });

    it('derives compile adapter truth from the canonical startRun contract', () => {
      expect(PLAN_COMPILE_BOUNDARY_SOURCE).toContain('SUPPORTED_START_RUN_TARGET_ADAPTERS');
      expect(PLAN_COMPILE_BOUNDARY_SOURCE).not.toContain(
        "['conductor', 'mock', 'temporal']"
      );
    });

    it('keeps generic preview planning on the protected runtime planner while compile stays on the compile boundary', () => {
      expect(APP_SOURCE).toMatch(
        /const previewPlanUseCase = new PreviewPlanUseCase\(\{\s*planner: protectedModule\.planner,/s
      );
      expect(APP_SOURCE).not.toMatch(
        /const previewPlanUseCase = new PreviewPlanUseCase\(\{\s*planner: protectedModule\.planCompilePlanner,/s
      );
      expect(APP_SOURCE).toMatch(
        /const compilePlanUseCase = new CompilePlanUseCase\(\{\s*planner: protectedModule\.planCompilePlanner,/s
      );
    });

    it('keeps implemented-adapter filtering inside the dedicated registry module', () => {
      expect(START_RUN_TARGET_ADAPTER_REGISTRY_SOURCE).toContain(
        'const allowedSet = new Set(SUPPORTED_START_RUN_TARGET_ADAPTERS);'
      );
      expect(START_RUN_TARGET_ADAPTER_REGISTRY_SOURCE).toContain(
        'isSupported(value: string): value is StartRunTargetAdapter'
      );
    });
  });
}
