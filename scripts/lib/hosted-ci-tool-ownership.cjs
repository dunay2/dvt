/**
 * Owned concern: admit complete hosted CI-tool obligations to their required producer.
 * @baseline Local Changed Files Gate: delegation is not executed or accepted evidence.
 * @decision Retain the original plan unless the same clean Git snapshot proves full ownership.
 * @consequence Local plans and every uncovered test keep their original execution.
 */
const path = require('node:path');
const { defaultRunGitLines, resolveIterationComparison } = require('../git-local-changes.cjs');
const { createGitRepositoryEnvironment } = require('./git-repository-environment.cjs');
const { normalizeChangedFiles } = require('./local-validation-plan-values.cjs');
const { buildCiToolTestList } = require('../../tools/ci/ci-tool-test-suite.mjs');
const {
  buildChangedScopeContext,
  computeWorkflowModeScopeOutputs,
  getChangedFiles,
} = require('../../tools/ci/scope-config.mjs');

const root = path.resolve(__dirname, '../..');
const sha = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

async function readSnapshot(context, repoRootPath) {
  const compare = () => resolveIterationComparison({ baseRef: context.baseSha, repoRootPath });
  const clean = () =>
    defaultRunGitLines(['status', '--porcelain'], {
      repoRootPath,
      env: createGitRepositoryEnvironment(),
    }).length === 0;
  const before = compare();
  const cleanBefore = clean();
  const changedFiles = await getChangedFiles(context.baseSha, context.headSha);
  const scopeContext = await buildChangedScopeContext(changedFiles, {
    baseRef: context.baseSha,
    headRef: context.headSha,
  });
  const scope = computeWorkflowModeScopeOutputs('workflow', changedFiles, scopeContext);
  const catalog = Object.fromEntries(
    ['all', 'static', 'executable'].map((mode) => [mode, buildCiToolTestList(mode)])
  );
  return { before, after: compare(), clean: cleanBefore && clean(), changedFiles, scope, catalog };
}

function completePartition(catalog) {
  const groups = ['all', 'static', 'executable'].map((mode) => catalog?.[mode]);
  if (groups.some((members) => !Array.isArray(members) || members.length === 0)) return false;
  const [all, staticTests, executable] = groups;
  const combined = [...staticTests, ...executable];
  return (
    new Set(all).size === all.length &&
    new Set(combined).size === combined.length &&
    all.length === combined.length &&
    combined.every((member) => all.includes(member))
  );
}

async function resolveHostedCiToolOwnership(plan, changedFiles, context, options = {}) {
  const retain = (reason) => ({ plan, delegation: { status: 'retained', reason } });
  if (
    context?.version !== 'v1' ||
    context.eventName !== 'pull_request' ||
    !sha.test(context.baseSha ?? '') ||
    !sha.test(context.headSha ?? '') ||
    context.headSha !== context.githubSha
  )
    return retain('Unsupported or incomplete hosted PR identity');
  const repoRootPath = path.resolve(options.repoRootPath ?? root);
  if (repoRootPath !== root || path.resolve(process.cwd()) !== repoRootPath)
    return retain('Scope reader cwd does not match the repository root');
  const completeSteps = plan.filter(
    (step) =>
      step.kind === 'test' &&
      step.command === 'pnpm' &&
      step.args.length === 1 &&
      step.args[0] === 'test:ci-tools'
  );
  if (completeSteps.length !== 1) return retain('One exact complete CI-tool step is required');
  let snapshot;
  try {
    const isolatedEnvironment = createGitRepositoryEnvironment();
    if (Object.keys(process.env).some((name) => !Object.hasOwn(isolatedEnvironment, name)))
      return retain('Repository-local Git environment prevents delegated ownership');
    snapshot = await (options.readSnapshot ?? readSnapshot)(context, repoRootPath);
  } catch (error) {
    return retain(
      `Snapshot query failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (
    snapshot.clean !== true ||
    [snapshot.before, snapshot.after].some(
      (observed) => observed?.baseSha !== context.baseSha || observed?.headSha !== context.headSha
    )
  )
    return retain('Git snapshot is dirty, unknown or changed');
  if (
    JSON.stringify(normalizeChangedFiles(snapshot.changedFiles)) !==
    JSON.stringify(normalizeChangedFiles(changedFiles))
  )
    return retain('Scope and committed-test frontiers differ');
  if (snapshot.scope?.ci_tool_executable_contracts_relevant !== true)
    return retain('Required executable producer is not selected');
  if (!completePartition(snapshot.catalog)) return retain('Complete catalog ownership is unproven');
  return {
    plan: plan.filter((step) => step !== completeSteps[0]),
    delegation: {
      status: 'delegated',
      producer: 'Code Quality Required for Merge',
      baseSha: context.baseSha,
      headSha: context.headSha,
      members: [...snapshot.catalog.all],
    },
  };
}

module.exports = { resolveHostedCiToolOwnership };
