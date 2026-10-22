/** Owned concern: project and validate DB-owned responsibilities as bounded source comments. */
const ts = require('typescript');

function validateResponsibilityBindings(input) {
  const errors = [];
  const bindings = [];
  const identities = new Set();
  const fields = ['responsibilityId', 'componentId', 'path', 'symbol', 'role', 'testPaths'];
  const identifiers = {
    responsibilityId: /^RESP-[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
    componentId: /^SYS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/,
  };
  const repositoryPath = (value) =>
    typeof value === 'string' &&
    value.length > 0 &&
    value === value.trim() &&
    !/[\\:]/.test(value) &&
    ![...value].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    ) &&
    !value.split('/').some((part) => !part || part === '.' || part === '..');
  if (!Array.isArray(input))
    return { bindings, errors: ['Responsibility bindings must be an array.'] };
  for (const [index, entry] of input.entries()) {
    const label = `Responsibility binding ${index}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${label} must be an object.`);
      continue;
    }
    if (
      Object.keys(entry).length !== fields.length ||
      fields.some((key) => !Object.hasOwn(entry, key)) ||
      Object.keys(entry).some((key) => !fields.includes(key))
    )
      errors.push(`${label} has missing or unknown fields.`);
    for (const key of ['responsibilityId', 'componentId']) {
      if (typeof entry[key] !== 'string' || !identifiers[key].test(entry[key]))
        errors.push(`${label} has invalid ${key}.`);
    }
    if (!repositoryPath(entry.path)) errors.push(`${label} has an unsafe or noncanonical path.`);
    else if (!/\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.path))
      errors.push(`${label} requires a TypeScript or JavaScript source path.`);
    if (
      typeof entry.symbol !== 'string' ||
      !/^[A-Za-z_$][\w$]*(?:\.#?[A-Za-z_$][\w$]*)*$/.test(entry.symbol)
    ) {
      errors.push(`${label} has an invalid qualified symbol.`);
    }
    if (!['implements', 'delegates', 'verifies'].includes(entry.role))
      errors.push(`${label} has an invalid role.`);
    if (
      !Array.isArray(entry.testPaths) ||
      entry.testPaths.length === 0 ||
      entry.testPaths.some((value) => !repositoryPath(value))
    ) {
      errors.push(`${label} requires nonempty canonical testPaths.`);
    } else if (new Set(entry.testPaths).size !== entry.testPaths.length) {
      errors.push(`${label} has duplicate testPaths.`);
    }
    const identity = JSON.stringify([entry.responsibilityId, entry.path, entry.symbol]);
    if (identities.has(identity))
      errors.push(`${label} is a duplicate or conflicting responsibility binding.`);
    identities.add(identity);
    bindings.push({
      responsibilityId: entry.responsibilityId,
      componentId: entry.componentId,
      path: entry.path,
      symbol: entry.symbol,
      role: entry.role,
      testPaths: Array.isArray(entry.testPaths) ? [...entry.testPaths].sort() : [],
    });
  }
  bindings.sort((left, right) => {
    const a = JSON.stringify([left.path, left.responsibilityId, left.symbol]);
    const b = JSON.stringify([right.path, right.responsibilityId, right.symbol]);
    return a === b ? 0 : a < b ? -1 : 1;
  });
  return { bindings: errors.length ? [] : bindings, errors };
}

function extractQualifiedSourceSymbols({ path, content }) {
  if (typeof path !== 'string' || typeof content !== 'string')
    throw new Error('Source path and content are required.');
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
  const compilerOptions = { noLib: true, noResolve: true, jsx: ts.JsxEmit.Preserve, allowJs: true };
  const host = ts.createCompilerHost(compilerOptions);
  host.getSourceFile = (name) => (name === path ? source : undefined);
  const diagnostics = ts
    .createProgram([path], compilerOptions, host)
    .getSyntacticDiagnostics(source);
  if (diagnostics.length)
    throw new Error(
      `Invalid source syntax in ${path}: ${ts.flattenDiagnosticMessageText(diagnostics[0].messageText, ' ')}`
    );
  const symbols = new Set();
  const record = (name) => {
    if (symbols.has(name)) throw new Error(`Ambiguous implemented symbol ${path}#${name}.`);
    symbols.add(name);
  };
  const declared = (node) =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) || []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword
    );
  const named = (node) =>
    node.name && (ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name));
  function visit(node, scope = '') {
    if (
      declared(node) ||
      ts.isClassExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    )
      return;
    if (ts.isMethodDeclaration(node) && !ts.isClassDeclaration(node.parent)) return;
    let nextScope = scope;
    const qualify = (name) => (scope ? `${scope}.${name}` : name);
    if (ts.isClassDeclaration(node) && named(node)) {
      nextScope = qualify(node.name.text);
      record(nextScope);
    } else if (ts.isModuleDeclaration(node) && named(node)) {
      nextScope = qualify(node.name.text);
    } else if (ts.isFunctionDeclaration(node) && node.body && named(node)) {
      nextScope = qualify(node.name.text);
      record(nextScope);
    } else if (ts.isMethodDeclaration(node) && node.body && named(node) && scope) {
      nextScope = qualify(node.name.text);
      record(nextScope);
    } else if (
      (ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) &&
      named(node) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      nextScope = qualify(node.name.text);
      record(nextScope);
      visit(node.initializer.body, nextScope);
      return;
    }
    ts.forEachChild(node, (child) => visit(child, nextScope));
  }
  visit(source);
  return [...symbols].sort();
}

function projectSourceResponsibilityHeader({
  path,
  content,
  bindings,
  ownerComponentId,
  responsibilities,
  currentPaths,
}) {
  const validated = validateResponsibilityBindings(bindings);
  const errors = [...validated.errors];
  const selected = validated.bindings.filter((binding) => binding.path === path);
  if (!selected.length) errors.push(`No responsibility bindings for ${path}.`);
  if (!ownerComponentId || ['UNOWNED', 'AMBIGUOUS'].includes(ownerComponentId))
    errors.push(`Unresolved component owner for ${path}.`);
  if (!(currentPaths instanceof Set) || !currentPaths.has(path))
    errors.push(`Source path ${path} is absent from the selected Git inventory.`);
  const canonical = new Map();
  if (!Array.isArray(responsibilities)) errors.push('Canonical responsibilities must be supplied.');
  for (const row of Array.isArray(responsibilities) ? responsibilities : []) {
    if (
      !row ||
      typeof row.responsibilityId !== 'string' ||
      !row.responsibilityId ||
      typeof row.componentId !== 'string' ||
      !row.componentId ||
      typeof row.description !== 'string' ||
      !row.description.trim()
    ) {
      errors.push('Invalid canonical responsibility authority.');
      continue;
    }
    const previous = canonical.get(row.responsibilityId);
    if (
      previous &&
      (previous.componentId !== row.componentId || previous.description !== row.description)
    ) {
      errors.push(`Conflicting responsibility authority for ${row.responsibilityId}.`);
    }
    canonical.set(row.responsibilityId, row);
  }
  let symbols = new Set();
  try {
    symbols = new Set(extractQualifiedSourceSymbols({ path, content }));
  } catch (error) {
    errors.push(error.message);
  }
  for (const binding of selected) {
    const responsibility = canonical.get(binding.responsibilityId);
    if (!responsibility)
      errors.push(`Unknown canonical responsibility ${binding.responsibilityId}.`);
    if (binding.componentId !== ownerComponentId)
      errors.push(`Binding component does not own ${path}.`);
    if (
      responsibility &&
      binding.role === 'implements' &&
      responsibility.componentId !== ownerComponentId
    ) {
      errors.push(
        `Implementation ${path}#${binding.symbol} does not belong to responsibility owner ${responsibility.componentId}.`
      );
    }
    if (!symbols.has(binding.symbol))
      errors.push(`Missing implemented symbol ${path}#${binding.symbol}.`);
    for (const testPath of binding.testPaths) {
      if (!(currentPaths instanceof Set) || !currentPaths.has(testPath))
        errors.push(`Declared test path ${testPath} is absent from the selected Git inventory.`);
    }
  }
  if (errors.length) return { header: null, errors };
  const quote = (text) =>
    JSON.stringify(text)
      .replace(/\*\//g, '*\\/')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  const lines = ['/**', ' * @sourceResponsibilities v1', ` * @component ${ownerComponentId}`];
  for (const binding of selected) {
    lines.push(
      ` * @responsibility ${binding.responsibilityId} ${quote(canonical.get(binding.responsibilityId).description)}`
    );
    lines.push(` * @${binding.role} ${binding.symbol}`);
    for (const testPath of binding.testPaths) lines.push(` * @test ${quote(testPath)}`);
  }
  lines.push(' */');
  return { header: lines.join('\n'), errors: [] };
}

function parseSourceResponsibilityHeader(content) {
  if (typeof content !== 'string')
    throw new Error('Source responsibility header requires source text.');
  const source = ts.createSourceFile('source.ts', content, ts.ScriptTarget.Latest, true);
  const comments = new Map();
  const collect = (ranges) => {
    for (const range of ranges || []) {
      if (content.slice(range.pos, range.end).includes('@sourceResponsibilities'))
        comments.set(range.pos, range);
    }
  };
  function visit(node) {
    collect(ts.getLeadingCommentRanges(content, node.pos));
    collect(ts.getTrailingCommentRanges(content, node.end));
    ts.forEachChild(node, visit);
  }
  collect(ts.getLeadingCommentRanges(content, 0));
  visit(source);
  if (!comments.size) return null;
  if (comments.size !== 1) throw new Error('Duplicate source responsibility header blocks.');
  const range = [...comments.values()][0];
  const fail = (reason) => {
    throw new Error(`Invalid source responsibility header: ${reason}.`);
  };
  if (source.statements.length && range.pos > source.statements[0].getStart(source))
    fail('marked block appears after executable content');
  const raw = content.slice(range.pos, range.end);
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  if (lines.shift() !== '/**' || lines.pop()?.trim() !== '*/') fail('malformed marked block');
  const body = lines.map((line) => {
    const match = /^ \* (.*)$/.exec(line);
    if (!match) fail('malformed block line');
    return match[1];
  });
  if (body.shift() !== '@sourceResponsibilities v1') fail('unknown marker or version');
  const component = /^@component ([A-Za-z0-9_$][A-Za-z0-9_.$:-]*)$/.exec(body.shift() || '');
  if (!component) fail('missing or invalid component');
  const bindings = [];
  let current;
  const parseString = (value) => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'string' || !parsed.trim()) fail('empty or nonstring declaration');
      return parsed;
    } catch {
      return fail('invalid JSON string');
    }
  };
  for (const line of body) {
    const responsibility = /^@responsibility (\S+) (".*")$/.exec(line);
    if (responsibility) {
      current = {
        responsibilityId: responsibility[1],
        description: parseString(responsibility[2]),
        componentId: component[1],
        testPaths: [],
      };
      bindings.push(current);
      continue;
    }
    const role = /^@(implements|delegates|verifies) (\S+)$/.exec(line);
    if (role) {
      if (!current || current.role || current.testPaths.length)
        fail('role outside its responsibility or duplicated');
      current.role = role[1];
      current.symbol = role[2];
      continue;
    }
    const test = /^@test (".*")$/.exec(line);
    if (!test || !current?.role) fail('unknown or misplaced declaration');
    current.testPaths.push(parseString(test[1]));
  }
  if (!bindings.length) fail('empty responsibility block');
  const shape = validateResponsibilityBindings(
    bindings.map(({ responsibilityId, componentId, symbol, role, testPaths }) => ({
      responsibilityId,
      componentId,
      symbol,
      role,
      testPaths,
      path: 'header.ts',
    }))
  );
  if (shape.errors.length) fail(shape.errors.join('; '));
  return { start: range.pos, end: range.end, componentId: component[1], bindings };
}

function validateSourceResponsibilityHeader(content, expectedHeader) {
  try {
    const actual = parseSourceResponsibilityHeader(content);
    if (expectedHeader === null)
      return {
        errors: actual ? ['Unexpected source responsibility header without DB bindings.'] : [],
      };
    const expected = parseSourceResponsibilityHeader(expectedHeader);
    if (!expected || expected.start !== 0 || expected.end !== expectedHeader.length)
      throw new Error('Expected responsibility header is invalid.');
    if (!actual) return { errors: ['Missing source responsibility header.'] };
    const normalize = (value) => value.replace(/\r\n?/g, '\n');
    return {
      errors:
        normalize(content.slice(actual.start, actual.end)) === normalize(expectedHeader)
          ? []
          : ['Source responsibility header differs from canonical DB declarations.'],
    };
  } catch (error) {
    return { errors: [error.message] };
  }
}

function synchronizeSourceResponsibilityHeader(content, expectedHeader) {
  const expected = parseSourceResponsibilityHeader(expectedHeader);
  if (!expected || expected.start !== 0 || expected.end !== expectedHeader.length)
    throw new Error('Expected responsibility header is invalid.');
  const actual = parseSourceResponsibilityHeader(content);
  const newline = content.match(/\r\n|\n|\r/)?.[0] || '\n';
  const header = expectedHeader.replace(/\r\n?|\n/g, newline);
  let updated;
  if (actual) updated = content.slice(0, actual.start) + header + content.slice(actual.end);
  else {
    let insertion = content.startsWith('\ufeff') ? 1 : 0;
    let separator = '';
    if (content.startsWith('#!', insertion)) {
      const lineEnd = /\r\n|\n|\r/.exec(content.slice(insertion));
      if (lineEnd) insertion += lineEnd.index + lineEnd[0].length;
      else {
        insertion = content.length;
        separator = newline;
      }
    }
    updated = content.slice(0, insertion) + separator + header + newline + content.slice(insertion);
  }
  return { content: updated, changed: updated !== content };
}

module.exports = {
  validateResponsibilityBindings,
  extractQualifiedSourceSymbols,
  projectSourceResponsibilityHeader,
  parseSourceResponsibilityHeader,
  validateSourceResponsibilityHeader,
  synchronizeSourceResponsibilityHeader,
};
