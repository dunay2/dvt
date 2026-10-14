/** Owned concern: verify syntax and literal fidelity of the shared code-symbol inventory. */
const assert = require('node:assert/strict');
const test = require('node:test');
const { buildCodeSymbolSnapshot } = require('./code-symbol-inventory.cjs');

test('code symbol snapshot extracts owned functions and exact body duplicate hashes', () => {
  const duplicateBody = [
    '  if (value === undefined || value === null || value === "") {',
    '    return fallback;',
    '  }',
    '  const parsed = Number(value);',
    '  if (!Number.isInteger(parsed) || parsed <= 0) {',
    '    throw new Error(`Invalid limit ${value}`);',
    '  }',
    '  return parsed;',
  ].join('\n');
  const sourceFiles = [
    {
      path: 'scripts/one.cjs',
      content: `function parseLimit(value, fallback) {\n${duplicateBody}\n}\n`,
    },
    {
      path: 'scripts/two.cjs',
      content: `const readLimit = (value, fallback) => {\n${duplicateBody}\n};\n`,
    },
  ];

  const snapshot = buildCodeSymbolSnapshot({
    sourceFiles,
    governanceSnapshot: {
      files: [
        {
          path: 'scripts/one.cjs',
          componentUnit: 'SYS-CI-TOOLS-PLANNING-DB',
          owningUnit: 'SYS-CI-TOOLS-PLANNING-DB',
          rootUnit: 'SYS-CI-GOVERNANCE-ROOT',
          domainUnit: 'SYS-CI-TOOLS',
        },
        {
          path: 'scripts/two.cjs',
          componentUnit: 'SYS-CI-TOOLS-PLANNING-DB',
          owningUnit: 'SYS-CI-TOOLS-PLANNING-DB',
          rootUnit: 'SYS-CI-GOVERNANCE-ROOT',
          domainUnit: 'SYS-CI-TOOLS',
        },
      ],
    },
  });

  assert.equal(snapshot.symbols.length, 2);
  assert.deepEqual(
    snapshot.symbols.map((symbol) => [
      symbol.symbolName,
      symbol.symbolKind,
      symbol.filePath,
      symbol.componentId,
      symbol.normalizedBodyLength > 100,
    ]),
    [
      ['parseLimit', 'function', 'scripts/one.cjs', 'SYS-CI-TOOLS-PLANNING-DB', true],
      ['readLimit', 'arrow_function', 'scripts/two.cjs', 'SYS-CI-TOOLS-PLANNING-DB', true],
    ]
  );
  assert.equal(snapshot.symbols[0].bodySha256, snapshot.symbols[1].bodySha256);
});

function symbols(content) {
  return buildCodeSymbolSnapshot({ sourceFiles: [{ path: 'apps/web/src/example.ts', content }] })
    .symbols;
}

test('captures typed functions and block arrows with source identity', () => {
  const result = symbols(
    'export function one<T>(value: T): T { return value; }\nexport const two = (value: string): string => { return value; };'
  );
  assert.deepEqual(
    result.map(({ symbolName, symbolKind, exportKind, startLine }) => [
      symbolName,
      symbolKind,
      exportKind,
      startLine,
    ]),
    [
      ['one', 'function', 'named', 1],
      ['two', 'arrow_function', 'named', 2],
    ]
  );
});

test('comments and formatting do not change an exact body fingerprint', () => {
  const [first, second] = symbols(
    'function one(value) { /* note */ return value + 1; }\nfunction two(value) {return value+1;}'
  );
  assert.equal(first.bodySha256, second.bodySha256);
});

test('preserves statement boundaries introduced by automatic semicolon insertion', () => {
  const [first, second] = symbols(
    'function one(value) { const ready = true; return\nvalue; }\nfunction two(value) { const ready = true; return value; }'
  );
  assert.notEqual(first.bodySha256, second.bodySha256);
});

for (const [left, right] of [
  ["'a  b'", "'a b'"],
  ['`a  b`', '`a b`'],
  ['/a  b/', '/a b/'],
]) {
  test(`preserves significant literal text: ${left}`, () => {
    const [first, second] = symbols(
      `function one() { return ${left}; }\nfunction two() { return ${right}; }`
    );
    assert.notEqual(first.bodySha256, second.bodySha256);
  });
}

test('does not invent functions or imports from comments and quoted code', () => {
  const result = symbols(
    '// function fake() { return 1; }\nconst sample = "function fake() { return 2; }";\nfunction real() { return "require(\'fake\')"; }'
  );
  assert.deepEqual(
    result.map(({ symbolName }) => symbolName),
    ['real']
  );
  assert.deepEqual(result[0].importRefs, []);
});

test('keeps regular-expression braces and template interpolation inside the body', () => {
  const [result] = symbols(
    'function real(value) { const pattern = /}/; return `${value.replace(pattern, "}")}`; }'
  );
  assert.equal(result.endLine, 1);
  assert.equal(result.rawSymbol.signature, 'function real(value)');
});
