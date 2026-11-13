/**
 * Owned concern: Verify framework, infrastructure and public package dependency boundaries.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectDependencyViolations } from './dependency-fixture.mjs';

test('dependency-cruiser boundary rules allow governed package entrypoints', async () => {
  const violations = await collectDependencyViolations({
    'apps/api/src/index.ts':
      "import runtime from '@dvt/engine/runtime'; import testing from '@dvt/engine/testing'; import engine from '@dvt/engine'; export default { runtime, testing, engine };\n",
    'packages/@dvt/engine/src/index.ts': 'export default 1;\n',
    'packages/@dvt/engine/src/runtime.ts': 'export default 2;\n',
    'packages/@dvt/engine/src/testing.ts': 'export default 3;\n',
  });

  assert.equal(violations.includes('no-cross-package-deep-imports'), false);
});

test('domain boundaries reject filesystem subpaths and retain HTTP root restrictions', async () => {
  const imports = [
    'fs',
    'node:fs',
    'fs/promises',
    'node:fs/promises',
    'http',
    'node:http',
    'https',
    'node:https',
  ];
  const violations = await collectDependencyViolations(
    Object.fromEntries(
      imports.map((specifier, index) => [
        `apps/web/src/capability/domain/builtin${index}.ts`,
        `import * as runtime from '${specifier}'; export default runtime;\n`,
      ])
    )
  );

  // Each independent source has exactly one dependency. Every edge must fail.
  assert.deepEqual(
    violations,
    imports.map(() => 'no-domain-to-framework-or-infrastructure')
  );
});

test('domain boundaries reject local infrastructure in apps and packages', async () => {
  const violations = await collectDependencyViolations({
    'apps/web/src/capability/domain/model.ts':
      "import repository from '../infrastructure/repository.js'; export default repository;\n",
    'apps/web/src/capability/infrastructure/repository.ts': 'export default 1;\n',
    'packages/@dvt/engine/src/domain/model.ts':
      "import repository from '../infrastructure/repository.js'; export default repository;\n",
    'packages/@dvt/engine/src/infrastructure/repository.ts': 'export default 1;\n',
  });

  assert.deepEqual(violations, [
    'no-domain-to-framework-or-infrastructure',
    'no-domain-to-framework-or-infrastructure',
  ]);
});

test('domain boundaries allow pure values and governed public ports', async () => {
  const violations = await collectDependencyViolations({
    'apps/web/src/capability/domain/model.ts':
      "import value from './value.js'; import type { Port } from '../../../../../packages/@dvt/contracts/src/index.js'; export const model: Port = { value };\n",
    'apps/web/src/capability/domain/value.ts': 'export default 1;\n',
    'packages/@dvt/contracts/src/index.ts': 'export interface Port { readonly value: number }\n',
    'packages/@dvt/engine/src/domain/model.ts':
      "import value from './value.js'; export default value;\n",
    'packages/@dvt/engine/src/domain/value.ts': 'export default 2;\n',
  });

  assert.deepEqual(violations, []);
});

test('contracts can import the runtime-neutral crypto authority', async () => {
  const violations = await collectDependencyViolations({
    'packages/@dvt/contracts/src/index.ts':
      "import { sha256HexUtf8 } from '../../crypto/src/index.js'; export default sha256HexUtf8;\n",
    'packages/@dvt/crypto/src/index.ts': 'export const sha256HexUtf8 = (value) => value;\n',
  });

  assert.equal(violations.includes('no-contracts-to-dvt-runtime'), false);
});
