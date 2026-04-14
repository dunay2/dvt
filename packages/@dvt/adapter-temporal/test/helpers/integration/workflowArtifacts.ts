import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));

export const WORKFLOW_PATH = resolve(TEST_DIR, '../../../src/workflows/RunPlanWorkflow.ts');
const WORKFLOW_JS_PATH = WORKFLOW_PATH.replace(/\.ts$/, '.js');
const WORKFLOW_DIST_JS_PATH = resolve(TEST_DIR, '../../../dist/workflows/RunPlanWorkflow.js');

export const INTEGRATION_TEST_TIMEOUT = 120_000;

export function assertWorkflowArtifactPresentInCi(): void {
  if (!existsSync(WORKFLOW_JS_PATH) && !existsSync(WORKFLOW_DIST_JS_PATH) && process.env.CI) {
    console.error(
      [
        '',
        `Workflow artifact not found: ${WORKFLOW_JS_PATH} (or ${WORKFLOW_DIST_JS_PATH})`,
        "Run 'pnpm build' first or ensure build completes successfully.",
        '',
      ].join('\n')
    );
    process.exit(1);
  }
}
