/** Owned concern: validate DB responsibility bindings against current source references. */
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

function validateSourceResponsibilityReferences({
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
  return { errors };
}

module.exports = {
  validateResponsibilityBindings,
  extractQualifiedSourceSymbols,
  validateSourceResponsibilityReferences,
};
