/** Owned concern: compile the real documentation tools with repository strictness. */
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

test('documentation tooling satisfies the repository TypeScript contract', () => {
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const files = ts.sys.readDirectory('tools/docs', ['.ts']);
  assert.ok(files.length > 0, 'No documentation tools were discovered');
  const program = ts.createProgram(files, {
    ...parsed.options,
    allowJs: true,
    noEmit: true,
  });
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  const report = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getCanonicalFileName: (file) => file,
    getNewLine: () => '\n',
  });
  assert.equal(diagnostics.length, 0, report);
});
