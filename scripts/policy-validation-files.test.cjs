const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { listMarkdownFiles } = require('./policy-validation-files.cjs');
const { CONTRACTS_ROOT, requireContractMarkdownFiles } = require('./policy-validation-files.cjs');

test('the canonical Engine contract corpus is current and nonempty', () => {
  assert.equal(
    CONTRACTS_ROOT,
    path.resolve(__dirname, '../docs/architecture/components/engine/contracts')
  );
  const files = requireContractMarkdownFiles(listMarkdownFiles(CONTRACTS_ROOT));
  assert.ok(files.length > 0);
  assert.ok(files.includes(path.join(CONTRACTS_ROOT, 'engine/RunEvents.v1.md')));
});

test('required contract admission rejects an empty Markdown corpus', () => {
  assert.throws(() => requireContractMarkdownFiles([]), /no Markdown|empty.*corpus/iu);
});

test('listMarkdownFiles recursively returns Markdown files only', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-validation-files-'));
  try {
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(path.join(root, 'a.md'), '# A\n');
    fs.writeFileSync(path.join(root, 'b.txt'), 'B\n');
    fs.writeFileSync(path.join(root, 'nested', 'c.md'), '# C\n');

    const files = listMarkdownFiles(root)
      .map((file) => path.relative(root, file).replaceAll(path.sep, '/'))
      .sort();

    assert.deepEqual(files, ['a.md', 'nested/c.md']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('policy validators import the shared Markdown file catalog', () => {
  const consumers = ['validate-references.cjs', 'validate-rfc2119.cjs'];

  for (const consumer of consumers) {
    const source = fs.readFileSync(path.join(__dirname, consumer), 'utf8');
    assert.match(source, /listMarkdownFiles/);
    assert.doesNotMatch(source, /function\s+walkMarkdown\b/);
  }
});
