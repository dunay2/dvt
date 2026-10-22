/** Owned concern: prove source responsibility authority uses the selected Git candidate. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { repository } = require('./feature-mechanization-git-fixture.cjs');
const {
  readComponentSourceResponsibilities,
  validateComponentSourceResponsibilities,
} = require('./component-source-responsibilities-reader.cjs');

function fixture(t) {
  const repo = repository(t);
  repo.write('model.ts', 'export function model() { return 1; }\n');
  repo.write('model.test.ts', 'export const proof = true;\n');
  repo.write('authority.md', 'Current declaration\n');
  const head = repo.commit(repo.base);
  const binding = {
    responsibilityId: 'RESP-MODEL',
    componentId: 'SYS-TEST',
    path: 'model.ts',
    symbol: 'model',
    role: 'implements',
    testPaths: ['model.test.ts'],
  };
  const rows = [
    {
      source_path: 'authority.md',
      source_content_sha256: crypto
        .createHash('sha256')
        .update('Current declaration\n')
        .digest('hex'),
      raw_manifest: { featureId: 'TEST', responsibilityBindings: [binding] },
    },
  ];
  const units = [
    {
      id: 'SYS-TEST',
      name: 'Model owner',
      parent: null,
      level: 'component',
      status: 'canonical',
      owns: ['*.ts'],
      excludes: [],
      responsibilities: [],
    },
  ];
  const responsibilities = [
    {
      responsibility_id: 'RESP-MODEL',
      component_id: 'SYS-TEST',
      responsibility: 'Publish the model',
      status: 'approved',
    },
  ];
  const client = {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      if (sql.includes('ranked_manifest_rows')) return { rows };
      if (sql.includes('governance_component_definition_query')) return { rows: units };
      if (sql.includes('component_responsibility_query')) return { rows: responsibilities };
      throw new Error('Unexpected DB query');
    },
    async end() {
      assert.fail('The injected client belongs to its caller');
    },
  };
  const options = (overrides = {}) => ({ client, gitReader: repo.reader(), ...overrides });
  return { repo, head, binding, rows, units, responsibilities, client, options };
}

test('reads every DB binding without requiring a source comment', async (t) => {
  const f = fixture(t);
  const result = await readComponentSourceResponsibilities(f.options());
  assert.deepEqual(result.errors, []);
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].path, 'model.ts');
  assert.equal(result.files[0].content, 'export function model() { return 1; }\n');
  assert.match(result.files[0].header, /RESP-MODEL/);
  assert.match(result.files[0].header, /Publish the model/);
  assert.ok(f.client.calls.every(({ sql }) => !/\b(?:insert|update|delete|refresh)\b/i.test(sql)));
  assert.deepEqual(
    f.client.calls.find(({ sql }) => sql.includes('component_responsibility_query')).params,
    [['RESP-MODEL']]
  );
});

test('missing header fails validation and the canonical header passes', async (t) => {
  const f = fixture(t);
  const missing = await validateComponentSourceResponsibilities(f.options());
  assert.equal(missing.fileCount, 1);
  assert.ok(missing.errors.length > 0);
  const { files } = await readComponentSourceResponsibilities(f.options());
  f.repo.write('model.ts', `${files[0].header}\n${files[0].content}`);
  assert.deepEqual(await validateComponentSourceResponsibilities(f.options()), {
    errors: [],
    fileCount: 1,
  });
});

test('an explicit SHA reads its contents, test references and source hash despite another checkout', async (t) => {
  const f = fixture(t);
  f.repo.write('model.ts', 'export const later = true;\n');
  f.repo.write('authority.md', 'Changed later\n');
  f.repo.git('rm', '--quiet', 'model.test.ts');
  f.repo.commit(f.head);
  const result = await readComponentSourceResponsibilities(
    f.options({ gitReader: f.repo.reader({ headRef: f.head }) })
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.files[0].content, 'export function model() { return 1; }\n');
});

for (const missing of ['model.ts', 'model.test.ts']) {
  test(`a deleted mandatory source or evidence path is rejected: ${missing}`, async (t) => {
    const f = fixture(t);
    f.repo.git('rm', '--quiet', missing);
    const result = await readComponentSourceResponsibilities(f.options());
    assert.ok(result.errors.some((error) => error.includes(missing)));
  });
}

test('an effective path-backed declaration must match the selected Git content hash', async (t) => {
  const f = fixture(t);
  f.repo.write('authority.md', 'Unrecorded change\n');
  await assert.rejects(readComponentSourceResponsibilities(f.options()), /stale.*authority\.md/i);
});

test('missing source authority does not fall back to an empty declaration', async (t) => {
  const f = fixture(t);
  f.repo.git('rm', '--quiet', 'authority.md');
  await assert.rejects(readComponentSourceResponsibilities(f.options()), /authority\.md/);
});

for (const changed of [false, true]) {
  test(`raw rail rows preserve ${changed ? 'conflicting' : 'identical duplicate'} bindings`, async (t) => {
    const f = fixture(t);
    f.rows.push({
      ...f.rows[0],
      raw_manifest: {
        featureId: 'OTHER',
        responsibilityBindings: [{ ...f.binding, role: changed ? 'delegates' : 'implements' }],
      },
    });
    const result = await readComponentSourceResponsibilities(f.options());
    assert.ok(result.errors.length > 0);
    assert.equal(result.files.length, 0);
  });
}

for (const reason of [
  'missing responsibility',
  'wrong responsibility owner',
  'unowned file',
  'ambiguous file',
]) {
  test(`canonical ownership failures reject: ${reason}`, async (t) => {
    const f = fixture(t);
    if (reason === 'missing responsibility') f.responsibilities.length = 0;
    if (reason === 'wrong responsibility owner') f.responsibilities[0].component_id = 'SYS-OTHER';
    if (reason === 'unowned file') f.units[0].owns = ['retired.ts'];
    if (reason === 'ambiguous file') f.units.push({ ...f.units[0], id: 'SYS-OTHER' });
    assert.ok((await readComponentSourceResponsibilities(f.options())).errors.length > 0);
  });
}

test('unavailable DB and Git evidence preserve their errors', async (t) => {
  const f = fixture(t);
  const failure = new Error('Planning DB unavailable');
  await assert.rejects(
    readComponentSourceResponsibilities(
      f.options({
        client: {
          query: async () => {
            throw failure;
          },
        },
      })
    ),
    (error) => error === failure
  );
  await assert.rejects(
    readComponentSourceResponsibilities(
      f.options({ gitReader: f.repo.reader({ headRef: 'refs/heads/absent' }) })
    ),
    /Git evidence unavailable/
  );
});

for (const status of ['proposed', 'drift']) {
  test(`a ${status} responsibility is not canonical acceptance`, async (t) => {
    const f = fixture(t);
    f.responsibilities[0].status = status;
    const result = await readComponentSourceResponsibilities(f.options());
    assert.ok(
      result.errors.some((error) => error.includes('RESP-MODEL') && error.includes(status))
    );
  });
}

test('an empty binding set cannot hide an orphan marked source header', async (t) => {
  const f = fixture(t);
  const { files } = await readComponentSourceResponsibilities(f.options());
  f.repo.write('model.ts', `${files[0].header}\n${files[0].content}`);
  f.rows[0].raw_manifest.responsibilityBindings = [];
  const result = await readComponentSourceResponsibilities(f.options());
  assert.ok(
    result.errors.some(
      (error) => /orphan|binding|undeclared/i.test(error) && error.includes('model.ts')
    )
  );
});

test('marker text in a string is not an orphan declaration', async (t) => {
  const f = fixture(t);
  delete f.rows[0].raw_manifest.responsibilityBindings;
  f.repo.write('model.ts', 'export const marker = "@sourceResponsibilities";\n');
  assert.deepEqual(await readComponentSourceResponsibilities(f.options()), {
    files: [],
    errors: [],
  });
});

test('orphan detection reads the explicit SHA even when the worktree removed the header', async (t) => {
  const f = fixture(t);
  const { files } = await readComponentSourceResponsibilities(f.options());
  f.repo.write('model.ts', `${files[0].header}\n${files[0].content}`);
  const markedHead = f.repo.commit(f.head);
  f.repo.write('model.ts', files[0].content);
  f.rows[0].raw_manifest.responsibilityBindings = [];
  const result = await readComponentSourceResponsibilities(
    f.options({ gitReader: f.repo.reader({ headRef: markedHead }) })
  );
  assert.ok(result.errors.some((error) => error.includes('Orphan') && error.includes('model.ts')));
});

test('a failed orphan search cannot be treated as no markers', async (t) => {
  const f = fixture(t);
  const gitReader = f.repo.reader();
  const runGit = gitReader.runGit.bind(gitReader);
  gitReader.runGit = (args) => {
    if (args[0] === 'grep')
      throw new Error('Git evidence unavailable: grep failed', { cause: { status: 2 } });
    return runGit(args);
  };
  await assert.rejects(
    readComponentSourceResponsibilities(f.options({ gitReader })),
    /grep failed/
  );
});

test('empty or malformed effective DB authority cannot succeed', async (t) => {
  const f = fixture(t);
  f.rows[0].raw_manifest = null;
  await assert.rejects(readComponentSourceResponsibilities(f.options()), /manifest|authority/i);
  f.rows.length = 0;
  await assert.rejects(
    readComponentSourceResponsibilities(f.options()),
    /empty.*authority|authority.*empty/i
  );
});

test('owned DB client is closed on failure without reconnecting the injected one', async (t) => {
  const f = fixture(t);
  const calls = [];
  const Client = class {
    async connect() {
      calls.push('connect');
      throw new Error('connection denied');
    }
    async end() {
      calls.push('end');
    }
  };
  await assert.rejects(
    readComponentSourceResponsibilities({ gitReader: f.repo.reader(), deps: { Client } }),
    /connection denied/
  );
  assert.deepEqual(calls, ['connect', 'end']);
});
