/** Owned concern: prove explicit source header writes preserve code and reject unsafe plans. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { synchronizeComponentSourceHeaders } = require('./sync-component-source-headers.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-source-header-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const content = '/** Existing rationale. */\nexport function run() { return 7; }\n';
  fs.writeFileSync(path.join(root, 'source.ts'), content);
  const header =
    '/**\n * @sourceResponsibilities v1\n * @component SYS-TEST\n * @responsibility RESP-TEST "Run a test action."\n * @implements run\n * @test "test.ts"\n */';
  return { root, content, header, files: [{ path: 'source.ts', content, header }] };
}

test('writes only the header and a second real filesystem synchronization is a no-op', async (t) => {
  const f = fixture(t);
  const read = async () => ({
    errors: [],
    files: f.files.map((file) => ({
      ...file,
      content: fs.readFileSync(path.join(f.root, file.path), 'utf8'),
    })),
  });
  const first = await synchronizeComponentSourceHeaders({ repoRootPath: f.root, read });
  assert.deepEqual(first.changedFiles, ['source.ts']);
  const changed = fs.readFileSync(path.join(f.root, 'source.ts'), 'utf8');
  assert.ok(changed.endsWith(f.content));
  const second = await synchronizeComponentSourceHeaders({ repoRootPath: f.root, read });
  assert.deepEqual(second.changedFiles, []);
  assert.equal(fs.readFileSync(path.join(f.root, 'source.ts'), 'utf8'), changed);
});

test('authority failure rejects the entire plan before any file write', async (t) => {
  const f = fixture(t);
  await assert.rejects(
    synchronizeComponentSourceHeaders({
      repoRootPath: f.root,
      read: async () => ({ files: f.files, errors: ['Unknown responsibility'] }),
    }),
    /Unknown responsibility/
  );
  assert.equal(fs.readFileSync(path.join(f.root, 'source.ts'), 'utf8'), f.content);
});

test('a changed source or an unsafe later path prevents all planned writes', async (t) => {
  const f = fixture(t);
  for (const badFile of [
    { path: '../outside.ts', content: '', header: f.header },
    { path: 'source.ts', content: 'stale', header: f.header },
  ]) {
    await assert.rejects(
      synchronizeComponentSourceHeaders({
        repoRootPath: f.root,
        read: async () => ({ files: [...f.files, badFile], errors: [] }),
      }),
      /unsafe|changed|duplicate/i
    );
    assert.equal(fs.readFileSync(path.join(f.root, 'source.ts'), 'utf8'), f.content);
  }
});

test('a malformed marked block prevents any overwrite', async (t) => {
  const f = fixture(t);
  const content = '/** @sourceResponsibilities broken */\n' + f.content;
  fs.writeFileSync(path.join(f.root, 'source.ts'), content);
  await assert.rejects(
    synchronizeComponentSourceHeaders({
      repoRootPath: f.root,
      read: async () => ({ files: [{ ...f.files[0], content }], errors: [] }),
    }),
    /sourceResponsibilities|header|marker/i
  );
  assert.equal(fs.readFileSync(path.join(f.root, 'source.ts'), 'utf8'), content);
});

test('explicit historical Git selection cannot be used for a source write', async () => {
  let reads = 0;
  await assert.rejects(
    synchronizeComponentSourceHeaders({
      headRef: 'HEAD',
      read: async () => {
        reads++;
        return { errors: [], files: [] };
      },
    }),
    /GIT_HEAD|head|candidate/i
  );
  assert.equal(reads, 0);
});
