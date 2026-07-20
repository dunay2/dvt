import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGitHubCheckRunPort,
  parseReleaseCandidateCheckArguments,
  runReleaseCandidateCheckCli,
} from './releaseCandidateCheckGithubAdapter.mjs';

const publicationSha = 'a'.repeat(40);

test('CLI arguments distinguish beginning and completing the check lifecycle', () => {
  assert.deepEqual(
    parseReleaseCandidateCheckArguments([
      'begin',
      '--repository',
      'dunay2/dvt',
      '--target',
      publicationSha,
      '--details-url',
      'https://github.com/dunay2/dvt/actions/runs/42',
      '--external-id',
      '42:1',
    ]),
    {
      command: 'begin',
      repository: 'dunay2/dvt',
      publicationSha,
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/42',
      externalId: '42:1',
    }
  );

  assert.deepEqual(
    parseReleaseCandidateCheckArguments([
      'complete',
      '--repository',
      'dunay2/dvt',
      '--target',
      publicationSha,
      '--check-run-id',
      '73',
      '--conclusion',
      'success',
    ]),
    {
      command: 'complete',
      repository: 'dunay2/dvt',
      publicationSha,
      checkRunId: 73,
      conclusion: 'success',
    }
  );

  assert.throws(
    () => parseReleaseCandidateCheckArguments(['begin', '--repository', 'dunay2/dvt']),
    /requires --repository, --target, --details-url, and --external-id/u
  );
});

test('GitHub adapter creates the check on head_sha and verifies identity before completion', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    const body = options.body ? JSON.parse(options.body) : undefined;
    if (options.method === 'POST') {
      return Response.json({
        id: 73,
        name: body.name,
        head_sha: body.head_sha,
        status: body.status,
      });
    }
    if (options.method === 'GET') {
      return Response.json({
        id: 73,
        name: 'Release candidate integrity',
        head_sha: publicationSha,
        status: 'in_progress',
      });
    }
    return Response.json({
      id: 73,
      name: body.name,
      head_sha: publicationSha,
      status: body.status,
      conclusion: body.conclusion,
    });
  };
  const port = createGitHubCheckRunPort({ token: 'token', fetchImpl });

  const created = await port.createCheckRun({
    repository: 'dunay2/dvt',
    name: 'Release candidate integrity',
    publicationSha,
    status: 'in_progress',
    detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/42',
    externalId: '42:1',
    output: { title: 'Running', summary: 'Running.' },
  });
  const completed = await port.completeCheckRun({
    repository: 'dunay2/dvt',
    name: 'Release candidate integrity',
    publicationSha,
    checkRunId: created.id,
    status: 'completed',
    conclusion: 'success',
    output: { title: 'Passed', summary: 'Passed.' },
  });

  assert.equal(created.publicationSha, publicationSha);
  assert.equal(completed.conclusion, 'success');
  assert.equal(requests[0].url, 'https://api.github.com/repos/dunay2/dvt/check-runs');
  assert.equal(JSON.parse(requests[0].options.body).head_sha, publicationSha);
  assert.equal(requests[1].options.method, 'GET');
  assert.equal(requests[2].options.method, 'PATCH');
});

test('GitHub adapter refuses to complete a mismatched check run', async () => {
  const port = createGitHubCheckRunPort({
    token: 'token',
    fetchImpl: async () =>
      Response.json({
        id: 73,
        name: 'Release candidate integrity',
        head_sha: 'b'.repeat(40),
        status: 'in_progress',
      }),
  });

  await assert.rejects(
    () =>
      port.completeCheckRun({
        repository: 'dunay2/dvt',
        name: 'Release candidate integrity',
        publicationSha,
        checkRunId: 73,
        status: 'completed',
        conclusion: 'failure',
        output: { title: 'Failed', summary: 'Failed.' },
      }),
    /does not belong to the authoritative pull request revision/u
  );
});

test('CLI emits only the check-run identity consumed by the workflow', async () => {
  const output = [];
  const exitCode = await runReleaseCandidateCheckCli(
    [
      'begin',
      '--repository',
      'dunay2/dvt',
      '--target',
      publicationSha,
      '--details-url',
      'https://github.com/dunay2/dvt/actions/runs/42',
      '--external-id',
      '42:1',
    ],
    {
      port: {
        createCheckRun: async (command) => ({
          id: 73,
          name: command.name,
          publicationSha: command.publicationSha,
          status: command.status,
        }),
      },
      write: (value) => output.push(value),
    }
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(output, ['73']);
});
