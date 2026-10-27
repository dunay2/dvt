/** Owned concern: prove real Python AST semantics and the bounded interpreter protocol. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const { readPythonSourceCodeFacts } = require('./python-source-facts.cjs');

test('actual Python AST names async, nested, class and static imports without executing source', () => {
  const facts = readPythonSourceCodeFacts({
    path: 'scripts/owned.py',
    content: [
      'import unavailable_product_provider as ignored',
      'from .protocol import decode',
      'raise RuntimeError("this module must never execute")',
      'async def outer(value):',
      '    def nested():',
      '        return value',
      '    return nested()',
      'class Owned:',
      '    async def read(self):',
      '        return 42',
      '# def phantom(): pass',
      'sample = "def phantom(): pass"',
    ].join('\n'),
  });
  assert.deepEqual(
    facts.declarations.filter((f) => f.kind !== 'variable').map((f) => f.qualifiedName),
    ['outer', 'outer.nested', 'Owned', 'Owned.read']
  );
  assert.equal(facts.declarations[0].isAsync, true);
  assert.equal(facts.declarations.find((f) => f.qualifiedName === 'Owned.read').isAsync, true);
  assert.deepEqual(facts.importRefs, ['.protocol', 'unavailable_product_provider']);
  assert.equal(Object.hasOwn(facts, 'source'), false);
  assert.ok(
    facts.declarations.every((f) => !Object.hasOwn(f, 'node') && !Object.hasOwn(f, 'body'))
  );
});

test('stub-only callables and classes do not manufacture implementation coverage', () => {
  const facts = readPythonSourceCodeFacts({
    path: 'scripts/stubs.py',
    content: [
      'def empty(): pass',
      'def dots(): ...',
      'def documented():',
      '    "only documentation"',
      'def unsupported(): raise NotImplementedError("not available")',
      'def sentinel(): return NotImplemented',
      'class Abstract:',
      '    def read(self): raise NotImplementedError',
      'class Real:',
      '    def read(self): return None',
      'def actual():',
      '    "documentation"',
      '    return 1',
    ].join('\n'),
  });
  assert.deepEqual(
    facts.declarations.filter((f) => f.implemented).map((f) => f.qualifiedName),
    ['Real', 'Real.read', 'actual']
  );
});

test('assigned lambdas retain actual callable identity without inventing declarations in expressions', () => {
  const facts = readPythonSourceCodeFacts({
    path: 'scripts/lambda.py',
    content: 'read = lambda value: value + 1\nstub = lambda: ...\n',
  });
  assert.deepEqual(
    facts.declarations.filter((f) => f.implemented).map((f) => f.qualifiedName),
    ['read']
  );
  assert.equal(facts.declarations[0].signature, 'read = lambda value:');
});

test('ambiguous implemented qualified names reject instead of certifying one body', () => {
  assert.throws(
    () =>
      readPythonSourceCodeFacts({
        path: 'scripts/ambiguous.py',
        content: 'def actual(): return 1\ndef actual(): return 2\n',
      }),
    { message: 'Python source facts unavailable or invalid' }
  );
});

for (const newline of ['\n', '\r\n', '\r']) {
  test(`physical ${JSON.stringify(newline)} lines preserve Unicode and UTF-16 source coordinates`, () => {
    const content = [
      'text = "😀 prefix\u2028still string\u2029"',
      '# 😀 comment',
      'def café(value):',
      '    return value + "😀"',
    ].join(newline);
    const fact = readPythonSourceCodeFacts({
      path: 'scripts/unicode.py',
      content,
    }).declarations.find((f) => f.name === 'café');
    assert.equal(fact.start, content.indexOf('def café'));
    assert.equal(
      content.slice(fact.start, fact.end),
      ['def café(value):', '    return value + "😀"'].join(newline)
    );
    assert.equal(fact.signature, 'def café(value):');
    assert.equal(fact.startLine, 3);
    assert.equal(fact.endLine, 4);
  });
}

test('interpreter selection and process limits are explicit and source travels only on stdin', () => {
  for (const [platform, env, expected] of [
    ['win32', {}, 'python.exe'],
    ['linux', {}, 'python3'],
    ['win32', { PYTHON: ' C:\\Python\\python.exe ' }, 'C:\\Python\\python.exe'],
  ]) {
    const file = { path: 'scripts/empty.py', content: '# no definitions\n' };
    const facts = readPythonSourceCodeFacts(file, {
      platform,
      env,
      execute(command, args, options) {
        assert.equal(command, expected);
        assert.deepEqual(args.slice(0, 2), ['-I', '-B']);
        assert.ok(args[2].endsWith('python-source-facts.py'));
        assert.deepEqual(JSON.parse(options.input), { schemaVersion: 1, ...file });
        assert.equal(options.timeout, 5_000);
        assert.equal(options.maxBuffer, 8 * 1024 * 1024);
        assert.equal(options.killSignal, 'SIGKILL');
        assert.equal(options.shell, false);
        assert.equal(options.windowsHide, true);
        return JSON.stringify({
          schemaVersion: 1,
          language: 'python',
          path: file.path,
          sourceLength: file.content.length,
          declarations: [],
          importRefs: [],
        });
      },
    });
    assert.deepEqual(facts, { language: 'python', declarations: [], importRefs: [] });
  }
});

test('syntax failures and unavailable interpreters expose only a fixed safe rejection', () => {
  for (const file of [
    { path: 'scripts/broken.py', content: 'def secret(:\nprivate-token' },
    { path: 'scripts/invalid.py', content: '\0' },
  ])
    assert.throws(() => readPythonSourceCodeFacts(file), {
      message: 'Python source facts unavailable or invalid',
    });
  assert.throws(
    () =>
      readPythonSourceCodeFacts(
        { path: 'scripts/owned.py', content: 'pass' },
        { env: { PYTHON: '__dvt_missing_python_interpreter__' } }
      ),
    { message: 'Python source facts unavailable or invalid' }
  );
  for (const code of ['ETIMEDOUT', 'ENOBUFS', 'ENOENT'])
    assert.throws(
      () =>
        readPythonSourceCodeFacts(
          { path: 'scripts/owned.py', content: 'pass' },
          {
            execute() {
              throw Object.assign(new Error('private URL/payload'), { code });
            },
          }
        ),
      { message: 'Python source facts unavailable or invalid' }
    );
});

test('malformed facts cannot become callable or source-range authority', () => {
  const file = { path: 'scripts/owned.py', content: 'def actual():\n    return 42\n' };
  const actual = readPythonSourceCodeFacts(file);
  const valid = { schemaVersion: 1, path: file.path, sourceLength: file.content.length, ...actual };
  const bad = [
    null,
    {},
    { ...valid, schemaVersion: 2 },
    { ...valid, path: 'other.py' },
    { ...valid, rawSource: 'private' },
    { ...valid, sourceLength: 0 },
    { ...valid, importRefs: ['os', 'os'] },
  ];
  for (const change of [
    { name: '' },
    { qualifiedName: 'actual\0secret' },
    { start: -1 },
    { start: 1 },
    { end: file.content.length + 1 },
    { startLine: 0 },
    { startLine: 2 },
    { endLine: 999 },
    { signature: 'other' },
    { signature: '' },
    { kind: 'variable' },
    { normalizedBody: null },
    { normalizedBody: '' },
    { statementCount: -1 },
    { extra: 'private' },
  ])
    bad.push({ ...valid, declarations: [{ ...valid.declarations[0], ...change }] });
  for (const payload of bad)
    assert.throws(
      () => readPythonSourceCodeFacts(file, { execute: () => JSON.stringify(payload) }),
      { message: 'Python source facts unavailable or invalid' }
    );
  assert.throws(() => readPythonSourceCodeFacts(file, { execute: () => 'private non-JSON text' }), {
    message: 'Python source facts unavailable or invalid',
  });
});

test('oversized requests reject before process creation and oversized responses reject', () => {
  let calls = 0;
  assert.throws(
    () =>
      readPythonSourceCodeFacts(
        { path: 'scripts/oversized.py', content: 'x'.repeat(8 * 1024 * 1024) },
        {
          execute() {
            calls++;
          },
        }
      ),
    { message: 'Python source facts unavailable or invalid' }
  );
  assert.equal(calls, 0);
  assert.throws(
    () =>
      readPythonSourceCodeFacts(
        { path: 'scripts/owned.py', content: 'pass' },
        { execute: () => ' '.repeat(8 * 1024 * 1024 + 1) }
      ),
    { message: 'Python source facts unavailable or invalid' }
  );
});

test('actual adapter is invoked with the bounded process port', () => {
  let calls = 0;
  const facts = readPythonSourceCodeFacts(
    { path: 'scripts/actual.py', content: 'def read(): return 42' },
    {
      execute(...args) {
        calls++;
        return execFileSync(...args);
      },
    }
  );
  assert.equal(calls, 1);
  assert.equal(facts.declarations[0].name, 'read');
});
