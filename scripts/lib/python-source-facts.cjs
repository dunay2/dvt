/** Owned concern: invoke the real Python AST provider through one bounded safe gateway. */
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

function resolvePythonSourceInterpreter(env, platform) {
  return typeof env.PYTHON === 'string' && env.PYTHON.trim()
    ? env.PYTHON.trim()
    : platform === 'win32'
      ? 'python.exe'
      : 'python3';
}

function validatePythonSourceFacts(value, file) {
  const keys = ['schemaVersion', 'language', 'path', 'sourceLength', 'declarations', 'importRefs'];
  const fields = [
    'name',
    'qualifiedName',
    'kind',
    'implemented',
    'linkable',
    'topLevel',
    'exportKind',
    'start',
    'end',
    'startLine',
    'endLine',
    'signature',
    'normalizedBody',
    'statementCount',
    'isAsync',
  ];
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key)) ||
    value.schemaVersion !== 1 ||
    value.language !== 'python' ||
    value.path !== file.path ||
    value.sourceLength !== file.content.length ||
    !Array.isArray(value.declarations) ||
    value.declarations.length > 100_000 ||
    !Array.isArray(value.importRefs) ||
    value.importRefs.some((ref) => typeof ref !== 'string' || !ref || ref.includes('\0')) ||
    new Set(value.importRefs).size !== value.importRefs.length
  )
    throw new Error('Invalid Python facts');
  const lines = file.content.split(/\r\n?|\n/u).length;
  const implemented = new Set();
  for (const fact of value.declarations) {
    if (
      !fact ||
      typeof fact !== 'object' ||
      Array.isArray(fact) ||
      Object.keys(fact).length !== fields.length ||
      fields.some((key) => !Object.hasOwn(fact, key)) ||
      typeof fact.name !== 'string' ||
      !fact.name ||
      typeof fact.qualifiedName !== 'string' ||
      !/^[_\p{ID_Start}][_\p{ID_Continue}]*(?:\.[_\p{ID_Start}][_\p{ID_Continue}]*)*$/u.test(
        fact.qualifiedName
      ) ||
      !(fact.qualifiedName === fact.name || fact.qualifiedName.endsWith('.' + fact.name)) ||
      !['function', 'method', 'class', 'variable'].includes(fact.kind) ||
      ['implemented', 'linkable', 'topLevel', 'isAsync'].some(
        (key) => typeof fact[key] !== 'boolean'
      ) ||
      fact.exportKind !== 'internal' ||
      typeof fact.signature !== 'string' ||
      !fact.signature ||
      typeof fact.normalizedBody !== 'string' ||
      !Number.isSafeInteger(fact.statementCount) ||
      fact.statementCount < 0 ||
      !Number.isSafeInteger(fact.start) ||
      !Number.isSafeInteger(fact.end) ||
      fact.start < 0 ||
      fact.end <= fact.start ||
      fact.end > file.content.length ||
      !Number.isSafeInteger(fact.startLine) ||
      !Number.isSafeInteger(fact.endLine) ||
      fact.startLine < 1 ||
      fact.endLine < fact.startLine ||
      fact.endLine > lines ||
      (fact.kind !== 'variable' && (!fact.statementCount || !fact.normalizedBody)) ||
      (fact.implemented &&
        (fact.kind === 'variable' || !fact.statementCount || !fact.normalizedBody))
    )
      throw new Error('Invalid Python declaration');
    if (
      file.content.slice(0, fact.start).split(/\r\n?|\n/u).length !== fact.startLine ||
      file.content.slice(0, fact.end).split(/\r\n?|\n/u).length !== fact.endLine ||
      !file.content.slice(fact.start, fact.end).startsWith(fact.signature) ||
      [fact.start, fact.end].some(
        (offset) =>
          /[\uDC00-\uDFFF]/u.test(file.content[offset] || '') &&
          /[\uD800-\uDBFF]/u.test(file.content[offset - 1] || '')
      ) ||
      (fact.topLevel && fact.qualifiedName !== fact.name)
    )
      throw new Error('Invalid Python source range');
    if (fact.implemented && implemented.has(fact.qualifiedName))
      throw new Error('Ambiguous Python implementation');
    if (fact.implemented) implemented.add(fact.qualifiedName);
  }
  return {
    language: 'python',
    declarations: value.declarations,
    importRefs: [...value.importRefs].sort(),
  };
}

function readPythonSourceCodeFacts(file, options = {}) {
  try {
    if (
      typeof file?.path !== 'string' ||
      !file.path.endsWith('.py') ||
      typeof file.content !== 'string'
    )
      throw new Error('Invalid Python source');
    const input = JSON.stringify({ schemaVersion: 1, path: file.path, content: file.content });
    if (Buffer.byteLength(input) > 8 * 1024 * 1024) throw new Error('Oversized Python source');
    const output = (options.execute ?? execFileSync)(
      resolvePythonSourceInterpreter(
        options.env ?? process.env,
        options.platform ?? process.platform
      ),
      ['-I', '-B', join(__dirname, 'python-source-facts.py')],
      {
        input,
        encoding: 'utf8',
        timeout: 5_000,
        killSignal: 'SIGKILL',
        maxBuffer: 8 * 1024 * 1024,
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    if (typeof output !== 'string' || Buffer.byteLength(output) > 8 * 1024 * 1024)
      throw new Error('Invalid Python output');
    return validatePythonSourceFacts(JSON.parse(output), file);
  } catch {
    throw new Error('Python source facts unavailable or invalid');
  }
}

module.exports = { readPythonSourceCodeFacts };
