/** Owned concern: prove DB-derived source declarations preserve code and reject false bindings. */
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateResponsibilityBindings,
  extractQualifiedSourceSymbols,
  projectSourceResponsibilityHeader,
  parseSourceResponsibilityHeader,
  validateSourceResponsibilityHeader,
  synchronizeSourceResponsibilityHeader,
} = require('./component-source-responsibilities.cjs');

const binding = (changes = {}) => ({
  responsibilityId: 'RESP-READ',
  componentId: 'SYS-OWNER',
  path: 'src/model.ts',
  symbol: 'Model.read',
  role: 'implements',
  testPaths: ['test/model.test.ts'],
  ...changes,
});
const source = 'export class Model { private read() { return 1; } }\n';
const projection = (changes = {}) =>
  projectSourceResponsibilityHeader({
    path: 'src/model.ts',
    content: source,
    bindings: [binding()],
    ownerComponentId: 'SYS-OWNER',
    responsibilities: [
      {
        responsibilityId: 'RESP-READ',
        componentId: 'SYS-OWNER',
        description: 'Read the selected generation.',
      },
    ],
    currentPaths: new Set(['src/model.ts', 'test/model.test.ts']),
    ...changes,
  });

test('binding validation accepts an explicit empty replacement and normalizes without mutation', () => {
  assert.deepEqual(validateResponsibilityBindings([]), { bindings: [], errors: [] });
  const input = [binding({ testPaths: ['test/z.ts', 'test/a.ts'] })];
  const original = structuredClone(input);
  const result = validateResponsibilityBindings(input);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.bindings[0].testPaths, ['test/a.ts', 'test/z.ts']);
  assert.deepEqual(input, original);
});

test('binding validation rejects malformed fields, unsafe paths and empty test references', () => {
  for (const invalid of [
    null,
    {},
    [null],
    [binding({ extra: true })],
    [binding({ responsibilityId: '' })],
    [binding({ responsibilityId: 'NOT-A-RESP' })],
    [binding({ componentId: 'NOT-A-COMPONENT' })],
    [binding({ componentId: ' owner ' })],
    [binding({ role: 'owns' })],
    [binding({ path: '../src/model.ts' })],
    [binding({ path: 'F:/model.ts' })],
    [binding({ path: 'src\\model.ts' })],
    [binding({ path: './src/model.ts' })],
    [binding({ path: 'src//model.ts' })],
    [binding({ symbol: 'Model.read()' })],
    [binding({ path: 'src/model.md' })],
    [binding({ testPaths: [] })],
    [binding({ testPaths: ['../outside.ts'] })],
    [binding({ testPaths: ['test/a.ts', 'test/a.ts'] })],
  ]) {
    const result = validateResponsibilityBindings(invalid);
    assert.ok(result.errors.length > 0, JSON.stringify(invalid));
    assert.deepEqual(result.bindings, []);
  }
});

test('binding identity rejects duplicates and conflicting roles or owners', () => {
  for (const second of [
    binding(),
    binding({ role: 'delegates' }),
    binding({ componentId: 'SYS-OTHER' }),
  ]) {
    assert.match(
      validateResponsibilityBindings([binding(), second]).errors.join('\n'),
      /duplicate|conflict/i
    );
  }
});

test('AST names real functions and qualified implemented methods including private methods', () => {
  const symbols = extractQualifiedSourceSymbols({
    path: 'model.ts',
    content: `
    import { phantom } from './fake';
    interface Contract { absent(): void }
    declare function declared(): void;
    export function actual() { return 1; }
    export const arrow = () => 2;
    class One {
      private read() { return 1; }
      static create() { return new One(); }
      callback = () => 1;
      overloaded(value: string): string;
      overloaded(value: number): number;
      overloaded(value: unknown) { return value; }
    }
    class Two { read() { return 2; } }
    // function fake() {}
    const quoted = 'function falseName() {}';
  `,
  });
  assert.ok(symbols.includes('actual'));
  assert.ok(symbols.includes('arrow'));
  assert.ok(symbols.includes('One.read'));
  assert.ok(symbols.includes('One.create'));
  assert.ok(symbols.includes('One.callback'));
  assert.equal(symbols.filter((symbol) => symbol === 'One.overloaded').length, 1);
  assert.ok(symbols.includes('Two.read'));
  for (const absent of ['phantom', 'Contract.absent', 'declared', 'fake', 'falseName', 'read']) {
    assert.equal(symbols.includes(absent), false, absent);
  }
});

test('AST rejects invalid syntax and ambiguous qualified implementations', () => {
  assert.throws(
    () => extractQualifiedSourceSymbols({ path: 'model.ts', content: 'function broken( {' }),
    /syntax/i
  );
  assert.throws(
    () =>
      extractQualifiedSourceSymbols({
        path: 'model.ts',
        content: 'class A { static read() {} read() {} }',
      }),
    /ambiguous/i
  );
});

test('AST does not invent qualified identities inside anonymous callbacks or class expressions', () => {
  const symbols = extractQualifiedSourceSymbols({
    path: 'model.ts',
    content: `
    function outer() {
      const first = class { read() {} };
      const second = class { read() {} };
      return [() => { function hidden() {} }, () => { function hidden() {} }];
    }
    class Holder { object = { run() {} }; }
  `,
  });
  assert.deepEqual(symbols, ['Holder', 'outer']);
});

test('projection reads canonical description and escapes comment terminators and multiline text', () => {
  const description = 'Read */ safely.\nKeep "quotes" and \\ paths.\u2028Done.';
  const result = projection({
    responsibilities: [{ responsibilityId: 'RESP-READ', componentId: 'SYS-OWNER', description }],
  });
  assert.deepEqual(result.errors, []);
  assert.match(result.header, /@sourceResponsibilities v1/);
  assert.equal((result.header.match(/\*\//g) || []).length, 1);
  const parsed = parseSourceResponsibilityHeader(result.header);
  assert.equal(parsed.componentId, 'SYS-OWNER');
  assert.equal(parsed.bindings[0].description, description);
  assert.equal(parsed.bindings[0].symbol, 'Model.read');
});

test('projection rejects unknown responsibilities, wrong file owner and cross-owner implementations', () => {
  for (const changes of [
    { responsibilities: [] },
    { ownerComponentId: 'AMBIGUOUS' },
    { ownerComponentId: 'SYS-OTHER' },
    {
      responsibilities: [
        { responsibilityId: 'RESP-READ', componentId: 'SYS-OTHER', description: 'Read.' },
      ],
    },
  ]) {
    const result = projection(changes);
    assert.ok(result.errors.length > 0);
    assert.equal(result.header, null);
  }
});

test('delegation and verification can reference a responsibility owned by another component', () => {
  for (const role of ['delegates', 'verifies']) {
    const result = projection({
      content: 'export function check() { return true; }',
      bindings: [binding({ symbol: 'check', role })],
      responsibilities: [
        { responsibilityId: 'RESP-READ', componentId: 'SYS-OTHER', description: 'Read.' },
      ],
    });
    assert.deepEqual(result.errors, []);
    assert.match(result.header, new RegExp(`@${role} check`));
  }
});

test('projection rejects missing symbols, wrong qualified owners and absent source or test paths', () => {
  for (const changes of [
    { bindings: [binding({ symbol: 'Other.read' })] },
    { content: 'export class Model { renamed() {} }' },
    { currentPaths: new Set(['src/model.ts']) },
    { currentPaths: new Set(['test/model.test.ts']) },
  ]) {
    const result = projection(changes);
    assert.ok(result.errors.length > 0);
    assert.equal(result.header, null);
  }
});

test('projection is deterministic for independent bindings and evidence ordering', () => {
  const bindings = [
    binding({ symbol: 'second' }),
    binding({ symbol: 'first', testPaths: ['test/z.ts', 'test/model.test.ts'] }),
  ];
  const changes = {
    content: 'function first() {} function second() {}',
    currentPaths: new Set(['src/model.ts', 'test/z.ts', 'test/model.test.ts']),
  };
  const first = projection({ ...changes, bindings });
  const second = projection({ ...changes, bindings: [...bindings].reverse() });
  assert.deepEqual(first.errors, []);
  assert.equal(first.header, second.header);
  assert.equal(parseSourceResponsibilityHeader(first.header).bindings.length, 2);
});

test('marked block parser ignores marker strings and rejects duplicates, malformed and misplaced blocks', () => {
  const header = projection().header;
  assert.equal(parseSourceResponsibilityHeader('const text = "@sourceResponsibilities v1";'), null);
  for (const invalid of [
    `${header}\n${header}\n${source}`,
    header.replace('@sourceResponsibilities v1', '@sourceResponsibilities v2'),
    header.replace(' * @implements Model.read\n', ''),
    header.replace(' * @test "test/model.test.ts"\n', ''),
    header.slice(0, -2),
    `${source}${header}`,
  ]) {
    assert.throws(
      () => parseSourceResponsibilityHeader(invalid),
      /responsibilit|header|block|marker/i
    );
  }
});

test('validation rejects deleted blocks and canonical text or symbol drift', () => {
  const header = projection().header;
  assert.deepEqual(validateSourceResponsibilityHeader(`${header}\n${source}`, header).errors, []);
  for (const invalid of [
    source,
    `${header.replace('Read the selected generation.', 'Different text.')}\n${source}`,
    `${header.replace('Model.read', 'Model.other')}\n${source}`,
  ]) {
    assert.ok(validateSourceResponsibilityHeader(invalid, header).errors.length > 0);
  }
});

test('orphan validation distinguishes a real marked block from an example string', () => {
  assert.deepEqual(
    validateSourceResponsibilityHeader('const text = "@sourceResponsibilities v1";', null),
    { errors: [] }
  );
  assert.match(
    validateSourceResponsibilityHeader(projection().header, null).errors.join('\n'),
    /unexpected/i
  );
});

test('synchronization preserves comments and executable content and is idempotent', () => {
  const original = '/** Existing human explanation. */\r\n' + source.replaceAll('\n', '\r\n');
  const header = projection().header;
  const first = synchronizeSourceResponsibilityHeader(original, header);
  assert.equal(first.changed, true);
  assert.ok(first.content.endsWith(original));
  assert.deepEqual(synchronizeSourceResponsibilityHeader(first.content, header), {
    content: first.content,
    changed: false,
  });
  assert.deepEqual(validateSourceResponsibilityHeader(first.content, header).errors, []);
  const nextHeader = projection({
    responsibilities: [
      {
        responsibilityId: 'RESP-READ',
        componentId: 'SYS-OWNER',
        description: 'Read updated canonical text.',
      },
    ],
  }).header;
  const replaced = synchronizeSourceResponsibilityHeader(first.content, nextHeader);
  assert.equal(replaced.changed, true);
  assert.ok(replaced.content.endsWith(original));
});

test('synchronization preserves BOM and shebang and refuses malformed blocks', () => {
  const original = '\ufeff#!/usr/bin/env node\n' + source;
  const header = projection().header;
  const result = synchronizeSourceResponsibilityHeader(original, header);
  assert.ok(result.content.startsWith('\ufeff#!/usr/bin/env node\n'));
  assert.ok(result.content.endsWith(source));
  assert.throws(
    () => synchronizeSourceResponsibilityHeader(header.replace(' v1', ' unknown'), header),
    /header|marker|version/i
  );
});
