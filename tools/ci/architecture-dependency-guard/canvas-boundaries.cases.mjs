/**
 * Owned concern: Verify Canvas command/query, readiness and composition dependency direction.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import { posix } from 'node:path';
import test from 'node:test';
import { collectDependencyViolations } from './dependency-fixture.mjs';

test('Canvas component boundaries reject reversed command/query and composition imports', async () => {
  const canvas = 'apps/web/src/app/views/canvas/';
  const cases = [
    [
      'no-canvas-readiness-to-effects',
      `${canvas}canvasReadinessPresentation.ts`,
      `${canvas}canvasPlanAction.ts`,
    ],
    [
      'no-canvas-run-command-to-presentation',
      `${canvas}canvasRunStartAction.ts`,
      `${canvas}canvasReadinessPresentation.ts`,
    ],
    [
      'no-canvas-run-command-to-presentation',
      `${canvas}canvasRunStartAction.ts`,
      `${canvas}copy.ts`,
    ],
    [
      'no-canvas-readiness-to-effects',
      `${canvas}canvasPlanReadiness.ts`,
      `${canvas}canvasPlanAction.ts`,
    ],
    [
      'no-canvas-readiness-to-effects',
      `${canvas}canvasRuntimePolicy.ts`,
      `${canvas}canvasDraftAutosaveExecution.ts`,
    ],
    [
      'no-canvas-readiness-to-effects',
      `${canvas}canvasRuntimePolicy.ts`,
      `${canvas}canvasDraftSaveExecution.ts`,
    ],
    [
      'no-canvas-readiness-to-effects',
      `${canvas}canvasDraftAccessPostureModel.ts`,
      'apps/web/src/app/services/api/client.ts',
    ],
    [
      'no-canvas-autosave-to-execution',
      `${canvas}useCanvasDraftAutosave.ts`,
      `${canvas}useCanvasExecutionActions.ts`,
    ],
    ...['canvasPlanAction', 'canvasRunStartAction', 'useCanvasController'].map((target) => [
      'no-canvas-autosave-to-execution',
      `${canvas}canvasDraftSaveExecution.ts`,
      `${canvas}${target}.ts`,
    ]),
    [
      'no-canvas-execution-to-route-composition',
      `${canvas}canvasPlanAction.ts`,
      `${canvas}useCanvasController.ts`,
    ],
    [
      'no-dvt-publication-policy-to-adapters',
      'apps/api/src/application/services/dvtWorkloadPublication.ts',
      'apps/api/src/infrastructure/client.ts',
    ],
    [
      'no-dvt-publication-policy-to-adapters',
      'apps/api/src/application/services/dvtWorkloadPublication.ts',
      'apps/web/src/app/view.ts',
    ],
    [
      'no-contracts-to-applications',
      'packages/@dvt/contracts/src/value.ts',
      `${canvas}canvasPlanAction.ts`,
    ],
  ];
  for (const [rule, from, to] of cases) {
    const relative = posix.relative(posix.dirname(from), to).replace(/\.ts$/u, '.js');
    const specifier = relative.startsWith('.') ? relative : `./${relative}`;
    for (const source of [
      `import value from '${specifier}'; export default value;\n`,
      `import type { Value } from '${specifier}'; export type Output = Value;\n`,
    ]) {
      assert.ok(
        (
          await collectDependencyViolations({
            [from]: source,
            [to]: 'export type Value = boolean; export default true;\n',
          })
        ).includes(rule),
        `Expected ${rule}: ${from} -> ${to}`
      );
    }
  }
});

test('Canvas readiness evaluation rejects presentation dependencies', async () => {
  const canvas = 'apps/web/src/app/views/canvas/';
  const cases = [
    [`${canvas}canvasDbtExecutionProjection.ts`, `${canvas}canvasCopyCatalog.ts`],
    [`${canvas}canvasDvtPreviewProjection.ts`, `${canvas}copy.ts`],
    [`${canvas}canvasExecutionGraph.ts`, 'apps/web/src/app/stores/applicationLanguageStore.ts'],
    [`${canvas}canvasPlanReadiness.ts`, `${canvas}canvasReadinessPresentation.ts`],
    [`${canvas}canvasPlanReadiness.ts`, `${canvas}canvasCopyCatalog.ts`],
    [`${canvas}canvasPlanReadiness.ts`, `${canvas}canvasCopy.types.ts`],
    [`${canvas}canvasExecutionState.ts`, `${canvas}canvasCopyFormatting.ts`],
    [`${canvas}canvasExecutionState.ts`, 'apps/web/src/app/stores/applicationLanguageStore.ts'],
    [
      `${canvas}canvasExecutionState.ts`,
      'apps/web/src/app/services/api/dvtOperationalRejectionCopy.ts',
    ],
  ];
  for (const [from, to] of cases) {
    const relative = posix.relative(posix.dirname(from), to).replace(/\.ts$/u, '.js');
    const specifier = relative.startsWith('.') ? relative : `./${relative}`;
    for (const source of [
      `import value from '${specifier}'; export default value;\n`,
      `import type { Value } from '${specifier}'; export type Output = Value;\n`,
    ]) {
      assert.ok(
        (
          await collectDependencyViolations({
            [from]: source,
            [to]: 'export type Value = boolean; export default true;\n',
          })
        ).includes('no-canvas-readiness-evaluation-to-presentation'),
        `${from} -> ${to}`
      );
    }
  }
});

test('Canvas component boundaries allow composition, ports and pure projections', async () => {
  const canvas = 'apps/web/src/app/views/canvas/';
  assert.deepEqual(
    await collectDependencyViolations({
      [`${canvas}useCanvasController.ts`]:
        "import action from './canvasPlanAction.js'; import save from './useCanvasDraftAutosave.js'; export default { action, save };\n",
      [`${canvas}canvasPlanAction.ts`]:
        "import readiness from './canvasPlanReadiness.js'; export default readiness;\n",
      [`${canvas}canvasPlanReadiness.ts`]:
        "import type { Plan } from '../../ports/plans.js'; export default (plan: Plan) => ({ ready: plan.ready });\n",
      [`${canvas}canvasReadinessPresentation.ts`]:
        "import readiness from './canvasPlanReadiness.js'; import copy from '../../services/api/dvtOperationalRejectionCopy.js'; export default { readiness, copy };\n",
      'apps/web/src/app/services/api/dvtOperationalRejectionCopy.ts': 'export default "Ready";\n',
      'apps/web/src/app/ports/plans.ts': 'export interface Plan { ready: boolean }\n',
      [`${canvas}useCanvasDraftAutosave.ts`]:
        "import repository from './canvasDraftRepository.js'; export default repository;\n",
      [`${canvas}canvasDraftSaveExecution.ts`]:
        "import repository from './canvasDraftRepository.js'; export default repository;\n",
      [`${canvas}canvasDraftRepository.ts`]: 'export default true;\n',
      'apps/api/src/application/services/dvtWorkloadPublication.ts':
        "import vocabulary from '@dvt/contracts'; export default vocabulary;\n",
      'packages/@dvt/contracts/index.ts': 'export default true;\n',
    }),
    []
  );
});
