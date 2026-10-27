/** Owned concern: prove DB responsibility references match current code without rewriting it. */
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  validateResponsibilityBindings,
  extractQualifiedSourceSymbols,
  validateSourceResponsibilityReferences,
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

test('a real Python callable can satisfy the same canonical responsibility reference', () => {
  const path = 'scripts/model.py';
  const result = validateSourceResponsibilityReferences({
    path,
    content: 'class Model:\n    def read(self):\n        return 1\n',
    bindings: [binding({ path })],
    ownerComponentId: 'SYS-OWNER',
    responsibilities: [
      { responsibilityId: 'RESP-READ', componentId: 'SYS-OWNER', description: 'Read.' },
    ],
    currentPaths: new Set([path, 'test/model.test.ts']),
  });
  assert.deepEqual(result.errors, []);
  for (const content of [
    'class Model:\n    def read(self): pass\n',
    'class Other:\n    def read(self): return 1\n',
  ]) {
    const rejected = validateSourceResponsibilityReferences({
      path,
      content,
      bindings: [binding({ path })],
      ownerComponentId: 'SYS-OWNER',
      responsibilities: [
        { responsibilityId: 'RESP-READ', componentId: 'SYS-OWNER', description: 'Read.' },
      ],
      currentPaths: new Set([path, 'test/model.test.ts']),
    });
    assert.match(rejected.errors.join('\n'), /Missing implemented symbol/);
  }
  assert.ok(
    validateResponsibilityBindings([binding({ path, symbol: 'Model.café' })]).errors.length > 0
  );
});
const validateReferences = (changes = {}) =>
  validateSourceResponsibilityReferences({
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

test('valid references accept plain source and leave code and DB inputs unchanged', () => {
  const input = {
    content: source,
    bindings: [binding()],
    responsibilities: [
      {
        responsibilityId: 'RESP-READ',
        componentId: 'SYS-OWNER',
        description: 'Read the selected generation.',
      },
    ],
    currentPaths: new Set(['src/model.ts', 'test/model.test.ts']),
  };
  const before = structuredClone(input);
  assert.deepEqual(validateReferences(input), { errors: [] });
  assert.deepEqual(input, before);
  assert.deepEqual(
    validateReferences({
      ...input,
      responsibilities: [
        { ...input.responsibilities[0], description: 'Read revised canonical metadata.' },
      ],
    }),
    { errors: [] }
  );
});

test('reference validation rejects unknown responsibilities, wrong file owner and cross-owner implementations', () => {
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
    const result = validateReferences(changes);
    assert.ok(result.errors.length > 0);
    assert.deepEqual(Object.keys(result), ['errors']);
  }
});

test('delegation and verification can reference a responsibility owned by another component', () => {
  for (const role of ['delegates', 'verifies']) {
    const result = validateReferences({
      content: 'export function check() { return true; }',
      bindings: [binding({ symbol: 'check', role })],
      responsibilities: [
        { responsibilityId: 'RESP-READ', componentId: 'SYS-OTHER', description: 'Read.' },
      ],
    });
    assert.deepEqual(result, { errors: [] });
  }
});

test('reference validation rejects missing symbols, wrong qualified owners and absent source or test paths', () => {
  for (const changes of [
    { bindings: [binding({ symbol: 'Other.read' })] },
    { content: 'export class Model { renamed() {} }' },
    { currentPaths: new Set(['src/model.ts']) },
    { currentPaths: new Set(['test/model.test.ts']) },
  ]) {
    const result = validateReferences(changes);
    assert.ok(result.errors.length > 0);
    assert.deepEqual(Object.keys(result), ['errors']);
  }
});

test('reference validation accepts collaborating symbols in either binding order', () => {
  const bindings = [
    binding({ symbol: 'second' }),
    binding({ symbol: 'first', testPaths: ['test/z.ts', 'test/model.test.ts'] }),
  ];
  const changes = {
    content: 'function first() {} function second() {}',
    currentPaths: new Set(['src/model.ts', 'test/z.ts', 'test/model.test.ts']),
  };
  const first = validateReferences({ ...changes, bindings });
  const second = validateReferences({ ...changes, bindings: [...bindings].reverse() });
  assert.deepEqual(first, { errors: [] });
  assert.deepEqual(second, first);
});

test('reference validation fails closed for missing, malformed or conflicting authority', () => {
  for (const changes of [
    { bindings: [] },
    { currentPaths: undefined },
    { ownerComponentId: undefined },
    { responsibilities: undefined },
    {
      responsibilities: [
        { responsibilityId: 'RESP-READ', componentId: 'SYS-OWNER', description: '' },
      ],
    },
    {
      responsibilities: [
        { responsibilityId: 'RESP-READ', componentId: 'SYS-OWNER', description: 'Read.' },
        { responsibilityId: 'RESP-READ', componentId: 'SYS-OTHER', description: 'Read.' },
      ],
    },
    { content: 'class Model {' },
  ]) {
    assert.ok(validateReferences(changes).errors.length > 0);
  }
});
