import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const corpusRoot = path.join(repoRoot, 'docs/architecture/components/engine/contracts');
const scripts = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts;
const validators = [
  { command: 'contracts:idempotency:validate', evidence: /files=[1-9]\d* vectors=[1-9]\d*/ },
  { command: 'contracts:examples:validate', evidence: /TypeScript snippets: [1-9]\d*/ },
  { command: 'contracts:glossary:validate', evidence: /GLOSSARY .*files=[1-9]\d*/ },
  { command: 'contracts:references:validate', evidence: /REFS .*files=[1-9]\d*/ },
  { command: 'contracts:rfc2119:validate', evidence: /RFC2119 .*files=[1-9]\d*/ },
];

function adapter(command) {
  const [runtime, file, ...args] = scripts[command].split(/\s+/u);
  assert.equal(runtime, 'node');
  return { file: path.join(repoRoot, file), args };
}

function runValidator(command, options = {}) {
  const { file, args } = adapter(command);
  const cliArgs = options.mode ? ['--mode', options.mode] : args;
  const inputRoot =
    command === 'contracts:idempotency:validate'
      ? path.join(options.corpus ?? corpusRoot, 'engine')
      : (options.corpus ?? corpusRoot);
  const invocation =
    options.corpus === undefined
      ? [file, ...cliArgs]
      : [
          '-e',
          `process.argv = ${JSON.stringify([process.execPath, file, ...cliArgs])}; require(${JSON.stringify(file)}).main(${JSON.stringify(inputRoot)});`,
        ];
  const result = spawnSync(process.execPath, invocation, { cwd: repoRoot, encoding: 'utf8' });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

function createCorpus(t, { copy = true } = {}) {
  const parent = realpathSync(tmpdir());
  const root = mkdtempSync(path.join(parent, 'dvt-contract-validation-'));
  t.after(() => {
    assert.equal(path.dirname(realpathSync(root)), parent);
    assert.ok(path.basename(root).startsWith('dvt-contract-validation-'));
    rmSync(root, { recursive: true, force: true });
  });
  if (copy) cpSync(corpusRoot, root, { recursive: true });
  return root;
}

function assertRejected(result, evidence) {
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, evidence);
}

function mutateVectors(t, mutate) {
  const corpus = createCorpus(t);
  const file = path.join(corpus, 'engine/RunEvents.v1.idempotency_vectors.json');
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  mutate(payload);
  writeFileSync(file, JSON.stringify(payload));
  return runValidator('contracts:idempotency:validate', { corpus });
}

for (const { command, evidence } of validators) {
  test(`${command} evaluates the nonempty real canonical corpus`, () => {
    const result = runValidator(command);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, evidence);
    assert.doesNotMatch(result.output, /skipping|No markdown files|no vectors artifact/u);
  });

  test(`${command} rejects an empty corpus even in warning mode`, (t) => {
    const corpus = createCorpus(t, { copy: false });
    if (command === 'contracts:idempotency:validate') mkdirSync(path.join(corpus, 'engine'));
    assertRejected(
      runValidator(command, { corpus, mode: 'warn' }),
      /corpus|glossary|vectors|Markdown|ENOENT/iu
    );
  });

  test(`${command} rejects an absent corpus`, (t) => {
    const corpus = path.join(createCorpus(t, { copy: false }), 'absent');
    assertRejected(runValidator(command, { corpus }), /corpus|glossary|vectors|ENOENT/iu);
  });
}

test('vector validation rejects a corrupt canonical digest', (t) => {
  const result = mutateVectors(t, (payload) => {
    payload.vectors[0].expectedDigest = '0'.repeat(64);
  });
  assertRejected(result, /digest mismatch/u);
});

test('vector validation retains required fields, attempts, RUN token and delimiter guards', (t) => {
  const mutations = [
    { omit: 'runId', evidence: /missing required field: runId/u },
    { fields: { logicalAttemptId: 0 }, evidence: /logicalAttemptId must be integer >= 1/u },
    {
      fields: { eventScope: 'run', stepIdNormalized: 'model.orders' },
      evidence: /run scope requires stepIdNormalized="RUN"/u,
    },
    { fields: { runId: 'run|foreign' }, evidence: /delimiter guard violated in runId/u },
  ];
  for (const mutation of mutations) {
    const result = mutateVectors(t, (payload) => {
      if (mutation.omit) delete payload.vectors[0][mutation.omit];
      Object.assign(payload.vectors[0], mutation.fields);
    });
    assertRejected(result, mutation.evidence);
  }
});

test('vector validation rejects an empty or malformed vector artifact', (t) => {
  assertRejected(
    mutateVectors(t, (payload) => {
      payload.vectors = [];
    }),
    /has no vectors/u
  );
  const corpus = createCorpus(t);
  writeFileSync(path.join(corpus, 'engine/RunEvents.v1.idempotency_vectors.json'), '{invalid');
  assertRejected(runValidator('contracts:idempotency:validate', { corpus }), /JSON|SyntaxError/u);
});

test('vector validation retains v2 plan identity and rejects its missing identity', (t) => {
  const corpus = createCorpus(t);
  const file = path.join(corpus, 'engine/RunEvents.v1.idempotency_vectors.json');
  const payload = {
    formulaVersion: 'v2.0.1',
    vectors: [
      {
        runId: '0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a',
        stepIdNormalized: 'model.orders',
        logicalAttemptId: 1,
        eventType: 'StepStarted',
        planId: 'plan_abc',
        planVersion: '2',
        expectedDigest: '7f4b974658a54fb2aee9ecb9cefebd2eec27f3fd01f0f8c0d031dfc4a5b96e3c',
      },
    ],
  };
  writeFileSync(file, JSON.stringify(payload));
  const accepted = runValidator('contracts:idempotency:validate', { corpus });
  assert.equal(accepted.status, 0, accepted.output);
  assert.match(accepted.output, /vectors=1 mismatches=0/u);
  delete payload.vectors[0].planId;
  writeFileSync(file, JSON.stringify(payload));
  assertRejected(
    runValidator('contracts:idempotency:validate', { corpus }),
    /planId is required for v2 formula/u
  );
  payload.vectors[0].planId = 'plan|foreign';
  writeFileSync(file, JSON.stringify(payload));
  assertRejected(
    runValidator('contracts:idempotency:validate', { corpus }),
    /delimiter guard violated in planId/u
  );
});

test('vector validation preserves UTF-8 material for non-ASCII identifiers', (t) => {
  const corpus = createCorpus(t);
  writeFileSync(
    path.join(corpus, 'engine/RunEvents.v1.idempotency_vectors.json'),
    JSON.stringify({
      formulaVersion: 'v1',
      vectors: [
        {
          runId: 'run-ñ',
          stepIdNormalized: 'model.订单',
          logicalAttemptId: 1,
          eventType: 'StepStarted',
          planVersion: '1',
          expectedDigest: '0ebf2308144f62d9d3a48fe3ddf619d93dfc1e9a0b507b41150c966bdc9f30e7',
        },
      ],
    })
  );
  const result = runValidator('contracts:idempotency:validate', { corpus });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /vectors=1 mismatches=0/u);
});

for (const invalidCode of ['const invalid: = 1;', 'interface Invalid { value: ; }']) {
  test(`example validation rejects malformed TypeScript: ${invalidCode}`, (t) => {
    const corpus = createCorpus(t);
    writeFileSync(
      path.join(corpus, 'invalid-proof.md'),
      '# Proof\n\n```ts\n' + invalidCode + '\n```\n'
    );
    assertRejected(
      runValidator('contracts:examples:validate', { corpus }),
      /invalid-proof\.md.*TS\d|invalid-proof\.md[\s\S]*Diagnostics: [1-9]/u
    );
  });
}

test('example validation rejects Markdown with zero TypeScript snippets', (t) => {
  const corpus = createCorpus(t, { copy: false });
  writeFileSync(path.join(corpus, 'no-examples.md'), '# Contract\n');
  assertRejected(
    runValidator('contracts:examples:validate', { corpus }),
    /no TypeScript|zero.*snippets|no executable/iu
  );
});

test('glossary validation rejects missing and empty canonical claim policy', (t) => {
  const corpus = createCorpus(t);
  const glossary = path.join(corpus, 'engine/GlossaryContract.v1.md');
  rmSync(glossary);
  assertRejected(runValidator('contracts:glossary:validate', { corpus }), /glossary.*not found/iu);
  writeFileSync(glossary, '# Glossary\n');
  assertRejected(
    runValidator('contracts:glossary:validate', { corpus }),
    /no prohibited|policy.*missing/iu
  );
  writeFileSync(
    glossary,
    '# Glossary\n\n## Prohibited terminology claims\n\n| Canonical term | Prohibited claim | Existing invariant |\n| --- | --- | --- |\n'
  );
  assertRejected(
    runValidator('contracts:glossary:validate', { corpus, mode: 'warn' }),
    /no prohibited|policy.*empty/iu
  );
});

test('glossary validation checks each current invariant claim and preserves warning mode', (t) => {
  const corpus = createCorpus(t);
  const file = path.join(corpus, 'claim-proof.md');
  const claims = [
    ['provider status is canonical lifecycle truth', 'CanonicalRunStatus'],
    ['engineAttemptId drives idempotency', 'logicalAttemptId'],
    ['timestamp order defines canonical event order', 'runSeq'],
  ];
  for (const [claim, canonical] of claims) {
    writeFileSync(file, claim + '.\n');
    const result = runValidator('contracts:glossary:validate', { corpus, mode: 'error' });
    assertRejected(result, /claim-proof\.md.*prohibited term/u);
    assert.ok(
      result.output.includes('"' + claim + '" -> prefer canonical "' + canonical + '"'),
      result.output
    );
  }
  const warning = runValidator('contracts:glossary:validate', { corpus, mode: 'warn' });
  assert.equal(warning.status, 0, warning.output);
  assert.match(warning.output, /status=WARN/u);
});

test('glossary validation rejects a malformed row rather than silently dropping a check', (t) => {
  const corpus = createCorpus(t);
  const glossary = path.join(corpus, 'engine/GlossaryContract.v1.md');
  const source = readFileSync(glossary, 'utf8');
  writeFileSync(
    glossary,
    source.replace('| runSeq | timestamp order defines canonical event order |', '| runSeq | |')
  );
  assertRejected(
    runValidator('contracts:glossary:validate', { corpus, mode: 'warn' }),
    /malformed.*policy|invalid.*claim.*row/iu
  );
});

test('the current glossary policy allows generic DDD and CQ vocabulary', (t) => {
  const corpus = createCorpus(t);
  writeFileSync(
    path.join(corpus, 'vocabulary-proof.md'),
    'The workflow execution receives a request with data for a command.\n'
  );
  const result = runValidator('contracts:glossary:validate', { corpus, mode: 'error' });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /files=[1-9]\d*.*findings=0.*status=OK/u);
});

test('reference validation retains broken-target and version-alignment rejection', (t) => {
  const corpus = createCorpus(t);
  writeFileSync(
    path.join(corpus, 'reference-proof.md'),
    '[Missing](missing-proof-target.md)\n[Contract v999](engine/RunEvents.v1.md)\n'
  );
  const result = runValidator('contracts:references:validate', { corpus, mode: 'error' });
  assertRejected(result, /missing-proof-target\.md/u);
  assert.match(result.output, /version-mismatch|version mismatch|label.*999/iu);
});

test('normative-language validation preserves strict findings and code exclusions', (t) => {
  const corpus = createCorpus(t);
  const file = path.join(corpus, 'language-proof.md');
  writeFileSync(file, 'The caller must retain its scope.\n');
  assertRejected(
    runValidator('contracts:rfc2119:validate', { corpus, mode: 'error' }),
    /language-proof\.md\r?\n\s+L1:C12 lowercase normative keyword "must"/u
  );
  writeFileSync(file, '`must`\n\n```ts\nconst text = "should";\n```\n');
  const result = runValidator('contracts:rfc2119:validate', { corpus, mode: 'warn' });
  assert.equal(result.status, 0, result.output);
  assert.doesNotMatch(result.output, /language-proof\.md\r?\n\s+L/u);
});
