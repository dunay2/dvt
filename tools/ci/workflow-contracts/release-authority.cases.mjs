/** Owned concern: release authority.
 * Why: retain focused workflow contracts through the existing two catalog entrypoints.
 * Corner: this module is loaded once; scope and authority failures remain visible.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import yaml from 'js-yaml';
import { assertWorkflowContains } from './assertions.mjs';
import { pinnedActionReferences } from './action-pins.mjs';

test('release generation and candidate admission have one trusted owner each', () => {
  const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf8');
  const prQualityWorkflow = readFileSync('.github/workflows/pr-quality-gate.yml', 'utf8');
  const integrityWorkflow = readFileSync(
    '.github/workflows/release-candidate-integrity.yml',
    'utf8'
  );
  const release = yaml.load(releaseWorkflow);
  const prQuality = yaml.load(prQualityWorkflow);
  const integrity = yaml.load(integrityWorkflow);

  assert.equal(
    pinnedActionReferences(releaseWorkflow, 'googleapis/release-please-action').length,
    1
  );
  assertWorkflowContains(releaseWorkflow, 'target-branch: main');
  assertWorkflowContains(releaseWorkflow, 'cancel-in-progress: false');
  const releasePleaseStep = release.jobs.release_please.steps.find((step) =>
    String(step.name).includes('release-please')
  );
  const releaseCredentialPreflight = release.jobs.release_please.steps.find(
    (step) => step.name === 'Require release governance credential'
  );
  assert.equal(releasePleaseStep.with.token, '${{ secrets.RELEASE_GOVERNANCE_TOKEN }}');
  assert.equal(
    releaseCredentialPreflight.env.RELEASE_GOVERNANCE_TOKEN,
    '${{ secrets.RELEASE_GOVERNANCE_TOKEN }}'
  );
  assert.match(releaseCredentialPreflight.run, /test -n "\$RELEASE_GOVERNANCE_TOKEN"/u);
  assert.doesNotMatch(
    releaseWorkflow,
    /token:\s*\$\{\{\s*(?:github\.token|secrets\.GITHUB_TOKEN)/u
  );
  assert.equal(release.on.workflow_dispatch, undefined);
  assert.equal(Object.keys(release.jobs).length, 1);
  assert.doesNotMatch(releaseWorkflow, /actions\/checkout|checks:\s*write|candidate_validation/u);

  assert.deepEqual(integrity.on.pull_request_target.types, [
    'opened',
    'synchronize',
    'reopened',
    'ready_for_review',
  ]);
  assert.deepEqual(integrity.permissions, { contents: 'read' });
  assert.deepEqual(Object.keys(integrity.jobs), [
    'classify_release_candidate_authority',
    'begin_release_candidate_integrity',
    'assess_release_candidate_integrity',
    'complete_release_candidate_integrity',
  ]);
  assert.deepEqual(integrity.jobs.classify_release_candidate_authority.permissions, {
    contents: 'read',
  });
  assert.equal(
    integrity.jobs.begin_release_candidate_integrity.needs,
    'classify_release_candidate_authority'
  );
  assert.deepEqual(integrity.jobs.assess_release_candidate_integrity.needs, [
    'classify_release_candidate_authority',
    'begin_release_candidate_integrity',
  ]);
  assert.equal(
    String(integrity.jobs.assess_release_candidate_integrity.if).replace(/\s+/gu, ' '),
    "${{ fromJSON(needs.classify_release_candidate_authority.outputs.classification-json).assessmentDisposition != 'not_applicable' }}"
  );
  assert.deepEqual(integrity.jobs.complete_release_candidate_integrity.needs, [
    'classify_release_candidate_authority',
    'begin_release_candidate_integrity',
    'assess_release_candidate_integrity',
  ]);
  const beginPublication = integrity.jobs.begin_release_candidate_integrity.steps.find(
    (step) => step.id === 'publish'
  );
  const completionPublication = integrity.jobs.complete_release_candidate_integrity.steps.find(
    (step) => String(step.name).startsWith('Publish final check outcome')
  );
  const assessmentEnforcement = integrity.jobs.complete_release_candidate_integrity.steps.find(
    (step) => step.name === 'Enforce required trusted assessment outcome'
  );
  const classifiedPublicationSha =
    '${{ fromJSON(needs.classify_release_candidate_authority.outputs.classification-json).publicationSha }}';
  assert.equal(beginPublication.env.PUBLICATION_SHA, classifiedPublicationSha);
  assert.equal(completionPublication.env.PUBLICATION_SHA, classifiedPublicationSha);
  assert.match(
    String(completionPublication.env.CHECK_CONCLUSION),
    /assessmentDisposition == 'not_applicable'/u
  );
  assert.match(
    String(completionPublication.env.CHECK_CONCLUSION),
    /needs\.assess_release_candidate_integrity\.result == 'success'/u
  );
  assert.match(String(assessmentEnforcement.if), /assessmentDisposition != 'not_applicable'/u);
  assert.deepEqual(integrity.jobs.begin_release_candidate_integrity.permissions, {
    contents: 'read',
    checks: 'write',
  });
  assert.deepEqual(integrity.jobs.assess_release_candidate_integrity.permissions, {
    contents: 'read',
  });
  const policyInspection = integrity.jobs.assess_release_candidate_integrity.steps.find(
    (step) => step.id === 'policy'
  );
  assert.equal(policyInspection.env.GH_TOKEN, '${{ secrets.RELEASE_GOVERNANCE_TOKEN }}');
  const candidateAssessment = integrity.jobs.assess_release_candidate_integrity.steps.find(
    (step) => step.name === 'Assess exact candidate with trusted code'
  );
  assert.equal(
    candidateAssessment.env.RELEASE_REPOSITORY_POLICY_JSON,
    '${{ toJSON(fromJSON(steps.policy.outputs.json).policy) }}'
  );
  assert.deepEqual(integrity.jobs.complete_release_candidate_integrity.permissions, {
    contents: 'read',
    checks: 'write',
  });
  assert.notEqual(
    integrity.jobs.begin_release_candidate_integrity.name,
    'Release candidate integrity'
  );
  assert.notEqual(
    integrity.jobs.assess_release_candidate_integrity.name,
    'Release candidate integrity'
  );
  assert.notEqual(
    integrity.jobs.complete_release_candidate_integrity.name,
    'Release candidate integrity'
  );
  assertWorkflowContains(integrityWorkflow, 'github.event.pull_request.base.sha');
  assertWorkflowContains(integrityWorkflow, 'github.event.pull_request.head.sha');
  assertWorkflowContains(integrityWorkflow, 'github.event.pull_request.merge_commit_sha');
  assertWorkflowContains(integrityWorkflow, 'github.event.pull_request.head.repo.full_name');
  assertWorkflowContains(integrityWorkflow, 'persist-credentials: false');
  assertWorkflowContains(integrityWorkflow, 'actions/setup-node@');
  assertWorkflowContains(integrityWorkflow, 'releaseCandidateIntegrityCli.mjs');
  assertWorkflowContains(integrityWorkflow, 'releaseCandidateAuthorityCli.mjs');
  assertWorkflowContains(integrityWorkflow, 'releaseMergePolicyCli.mjs inspect');
  assertWorkflowContains(integrityWorkflow, 'releaseCandidateCheckGithubAdapter.mjs begin');
  assertWorkflowContains(integrityWorkflow, 'releaseCandidateCheckGithubAdapter.mjs complete');
  assertWorkflowContains(integrityWorkflow, 'needs.assess_release_candidate_integrity.result');
  assertWorkflowContains(
    integrityWorkflow,
    'fromJSON(needs.classify_release_candidate_authority.outputs.classification-json).publicationSha'
  );
  assert.doesNotMatch(integrityWorkflow, /name:\s*Classify pull request authority/u);
  assert.doesNotMatch(integrityWorkflow, /if \[\[ "\$HEAD_REF"/u);
  assert.doesNotMatch(integrityWorkflow, /pnpm\s+--dir\s+candidate/u);

  assert.equal(prQuality.permissions['pull-requests'], 'read');
  assert.equal(prQuality.jobs['release-candidate-integrity'], undefined);
  assert.equal(
    prQuality.jobs['all-checks-passed'].needs.includes('release-candidate-integrity'),
    false
  );
  for (const job of Object.values(prQuality.jobs)) {
    for (const step of job.steps ?? []) {
      if (String(step.uses ?? '').startsWith('actions/checkout@')) {
        assert.equal(step.with?.['persist-credentials'], false);
      }
    }
  }
});
