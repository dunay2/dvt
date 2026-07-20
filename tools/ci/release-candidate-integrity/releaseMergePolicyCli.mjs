import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { assessRepositoryMergePolicy } from './releaseCandidateIntegrity.mjs';

const REQUIRED_CHECKS = [
  { context: 'All Checks Required for Merge', integration_id: 15368 },
  { context: 'Release candidate integrity', integration_id: 15368 },
];
const SUPPORTED_FLAGS = new Set(['repo', 'ruleset']);

function copyRule(rule) {
  return rule.parameters
    ? { type: rule.type, parameters: structuredClone(rule.parameters) }
    : { type: rule.type };
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function policyFingerprint(repository, ruleset) {
  return canonicalJson({ repository, ruleset });
}

export function projectReleaseMergePolicy(repository, ruleset) {
  if (!Object.hasOwn(ruleset, 'bypass_actors') || !Array.isArray(ruleset.bypass_actors)) {
    throw new Error(
      'Repository ruleset does not expose bypass actors; release policy visibility is incomplete.'
    );
  }
  const pullRequestRule = ruleset.rules?.find((rule) => rule.type === 'pull_request');
  const requiredChecksRule = ruleset.rules?.find((rule) => rule.type === 'required_status_checks');
  return {
    repository: {
      defaultBranch: repository.default_branch,
      allowMergeCommit: repository.allow_merge_commit,
      allowRebaseMerge: repository.allow_rebase_merge,
      allowSquashMerge: repository.allow_squash_merge,
      squashMergeCommitTitle: repository.squash_merge_commit_title,
      squashMergeCommitMessage: repository.squash_merge_commit_message,
    },
    mainRuleset: {
      target: ruleset.target,
      enforcement: ruleset.enforcement,
      bypassActors: structuredClone(ruleset.bypass_actors),
      conditions: {
        refName: structuredClone(ruleset.conditions?.ref_name ?? { include: [], exclude: [] }),
      },
      allowedMergeMethods: pullRequestRule?.parameters?.allowed_merge_methods ?? [],
      strictRequiredStatusChecksPolicy:
        requiredChecksRule?.parameters?.strict_required_status_checks_policy ?? false,
      requiredStatusChecks: (requiredChecksRule?.parameters?.required_status_checks ?? []).map(
        (check) => ({
          context: check.context,
          integrationId: check.integration_id,
        })
      ),
    },
  };
}

export function buildReleaseMergePolicyUpdate(_repository, ruleset) {
  const rules = (ruleset.rules ?? []).map(copyRule);
  const pullRequestRule = rules.find((rule) => rule.type === 'pull_request');
  if (!pullRequestRule) {
    throw new Error(`Ruleset ${ruleset.name} does not contain a pull_request rule.`);
  }
  pullRequestRule.parameters.allowed_merge_methods = ['squash'];

  let requiredChecksRule = rules.find((rule) => rule.type === 'required_status_checks');
  if (!requiredChecksRule) {
    requiredChecksRule = {
      type: 'required_status_checks',
      parameters: {
        do_not_enforce_on_create: true,
        strict_required_status_checks_policy: true,
        required_status_checks: [],
      },
    };
    rules.push(requiredChecksRule);
  }
  const checks = requiredChecksRule.parameters.required_status_checks ?? [];
  requiredChecksRule.parameters.required_status_checks = [
    ...checks.filter(
      (check) => !REQUIRED_CHECKS.some((required) => required.context === check.context)
    ),
    ...REQUIRED_CHECKS,
  ];
  requiredChecksRule.parameters.strict_required_status_checks_policy = true;
  requiredChecksRule.parameters.do_not_enforce_on_create = true;

  return {
    repository: {
      allow_merge_commit: false,
      allow_rebase_merge: false,
      allow_squash_merge: true,
      squash_merge_commit_title: 'PR_TITLE',
      squash_merge_commit_message: 'BLANK',
    },
    ruleset: {
      name: ruleset.name,
      target: 'branch',
      enforcement: 'active',
      bypass_actors: [],
      conditions: {
        ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] },
      },
      rules,
    },
  };
}

export function parseReleaseMergePolicyArguments(argv) {
  const [command, ...rest] = argv;
  if (!['inspect', 'configure'].includes(command)) {
    throw new TypeError('Release merge policy command must be inspect or configure.');
  }
  const values = new Map();
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag?.startsWith('--') || !value) {
      throw new TypeError(`Invalid release merge policy argument near ${flag ?? '<end>'}.`);
    }
    const name = flag.slice(2);
    if (!SUPPORTED_FLAGS.has(name)) {
      throw new TypeError(`Unknown release merge policy argument: ${flag}.`);
    }
    if (values.has(name)) {
      throw new TypeError(`Duplicate release merge policy argument: ${flag}.`);
    }
    values.set(name, value);
  }
  const repository = values.get('repo');
  const rulesetName = values.get('ruleset');
  if (!repository || !rulesetName) {
    throw new TypeError('Release merge policy requires --repo and --ruleset.');
  }
  return { command, repository, rulesetName };
}

function defaultRequest({ method, path, body }) {
  const args = ['api', '--method', method, path];
  if (body) {
    args.push('--input', '-');
  }
  const output = execFileSync('gh', args, {
    encoding: 'utf8',
    input: body ? JSON.stringify(body) : undefined,
  });
  return output.trim() ? JSON.parse(output) : null;
}

function loadPolicy(repository, rulesetName, request) {
  const repositoryRecord = request({ method: 'GET', path: `repos/${repository}` });
  const rulesets = request({ method: 'GET', path: `repos/${repository}/rulesets` });
  const rulesetSummary = rulesets.find((candidate) => candidate.name === rulesetName);
  if (!rulesetSummary) {
    throw new Error(`Repository ruleset not found: ${rulesetName}.`);
  }
  const ruleset = request({
    method: 'GET',
    path: `repos/${repository}/rulesets/${rulesetSummary.id}`,
  });
  return { repositoryRecord, ruleset };
}

export function runReleaseMergePolicyCli(
  argv = process.argv.slice(2),
  { request = defaultRequest, write = (value) => console.log(value) } = {}
) {
  const { command, repository, rulesetName } = parseReleaseMergePolicyArguments(argv);
  let loaded = loadPolicy(repository, rulesetName, request);
  if (command === 'configure') {
    const update = buildReleaseMergePolicyUpdate(loaded.repositoryRecord, loaded.ruleset);
    const initialFingerprint = policyFingerprint(loaded.repositoryRecord, loaded.ruleset);
    const confirmed = loadPolicy(repository, rulesetName, request);
    if (policyFingerprint(confirmed.repositoryRecord, confirmed.ruleset) !== initialFingerprint) {
      throw new Error('Repository release policy changed concurrently before configuration.');
    }
    request({ method: 'PATCH', path: `repos/${repository}`, body: update.repository });
    const rulesetBeforeWrite = request({
      method: 'GET',
      path: `repos/${repository}/rulesets/${loaded.ruleset.id}`,
    });
    if (canonicalJson(rulesetBeforeWrite) !== canonicalJson(loaded.ruleset)) {
      throw new Error('Repository ruleset changed concurrently before configuration.');
    }
    request({
      method: 'PUT',
      path: `repos/${repository}/rulesets/${loaded.ruleset.id}`,
      body: update.ruleset,
    });
    loaded = loadPolicy(repository, rulesetName, request);
  }

  const policy = projectReleaseMergePolicy(loaded.repositoryRecord, loaded.ruleset);
  const violations = assessRepositoryMergePolicy(policy);
  write(JSON.stringify({ valid: violations.length === 0, violations, policy }, null, 2));
  return violations.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runReleaseMergePolicyCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
