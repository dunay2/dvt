/** Owned concern: assert workflow declaration inclusion, exclusion and occurrence counts.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';

export function assertWorkflowContains(workflow, snippet) {
  assert.ok(workflow.includes(snippet), `workflow must include: ${snippet}`);
}

export function assertWorkflowExcludes(workflow, snippet) {
  assert.ok(!workflow.includes(snippet), `workflow must exclude: ${snippet}`);
}

export function countWorkflowCommand(workflow, command) {
  return workflow.split(command).length - 1;
}
