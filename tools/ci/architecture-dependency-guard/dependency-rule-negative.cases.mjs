/**
 * Owned concern: Exercise every independent negative dependency-rule fixture.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectDependencyViolations } from './dependency-fixture.mjs';

const DEPENDENCY_RULE_FIXTURES = [
  {
    ruleName: 'no-contracts-to-dvt-runtime',
    files: {
      'packages/@dvt/contracts/src/index.ts':
        "import runtime from '../../engine/src/index.js'; export default runtime;\n",
      'packages/@dvt/engine/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-planner-to-engine-or-adapters',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import runtime from '../../engine/src/index.js'; export default runtime;\n",
      'packages/@dvt/engine/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-engine-to-concrete-adapters',
    files: {
      'packages/@dvt/engine/src/index.ts':
        "import adapter from '../../adapter-postgres/src/index.js'; export default adapter;\n",
      'packages/@dvt/adapter-postgres/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-adapters-to-contract-internals',
    files: {
      'packages/@dvt/adapter-postgres/src/index.ts':
        "import internalContract from '../../contracts/src/internal.js'; export default internalContract;\n",
      'packages/@dvt/contracts/src/internal.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-web-to-backend-adapters',
    files: {
      'apps/web/src/index.ts':
        "import adapter from '../../../packages/@dvt/adapter-postgres/src/index.js'; export default adapter;\n",
      'packages/@dvt/adapter-postgres/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-presentation-to-infrastructure',
    files: {
      'apps/web/src/capability/presentation/view.ts':
        "import client from '../infrastructure/client.js'; export default client;\n",
      'apps/web/src/capability/infrastructure/client.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-domain-to-framework-or-infrastructure',
    files: {
      'apps/web/src/capability/domain/model.ts':
        "import { readFileSync } from 'node:fs'; export default readFileSync;\n",
    },
  },
  {
    ruleName: 'no-dvt-package-cycles',
    files: {
      'packages/@dvt/engine/src/a.ts': "import b from './b.js'; export default b;\n",
      'packages/@dvt/engine/src/b.ts': "import a from './a.js'; export default a;\n",
    },
  },
  {
    ruleName: 'no-cross-package-deep-imports',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import privateContract from '@dvt/contracts/src/contracts/private.js'; export default privateContract;\n",
      'packages/@dvt/contracts/src/contracts/private.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-cross-package-deep-imports',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import privateContract from '../../contracts/src/contracts/private.js'; export default privateContract;\n",
      'packages/@dvt/contracts/src/contracts/private.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-runtime-packages-to-scripts-or-tools',
    files: {
      'packages/@dvt/engine/src/index.ts':
        "import tool from '../../../../tools/runtime-helper.js'; export default tool;\n",
      'tools/runtime-helper.js': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-api-domain-to-application',
    files: {
      'apps/api/src/domain/value.ts':
        "import service from '../application/service.js'; export default service;\n",
      'apps/api/src/application/service.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-api-application-to-fastify-or-jwt',
    files: {
      'apps/api/src/application/service.ts': "import token from 'jose'; export default token;\n",
    },
  },
  {
    ruleName: 'no-api-application-to-oidc-libs',
    files: {
      'apps/api/src/application/service.ts':
        "import client from 'openid-client'; export default client;\n",
    },
  },
  {
    ruleName: 'no-api-ports-to-http-types',
    files: {
      'apps/api/src/application/ports/port.ts':
        "import request from 'node:http'; export default request;\n",
    },
  },
  {
    ruleName: 'no-api-production-to-test-support',
    files: {
      'apps/api/src/index.ts':
        "import support from '../test/support.js'; export default support;\n",
      'apps/api/test/support.ts': 'export default 1;\n',
    },
  },
];

test('dependency-cruiser boundary rules fail for representative negative imports', async () => {
  for (const fixture of DEPENDENCY_RULE_FIXTURES) {
    const violations = await collectDependencyViolations(fixture.files);
    assert.ok(
      violations.includes(fixture.ruleName),
      `expected ${fixture.ruleName} to fail; got ${violations.join(', ')}`
    );
  }
});
