/**
 * Owned concern: acquire package dependencies through the CI test module graph.
 * @baseline CI-SCOPE-OPTIMIZATION-20260508: transitive packages require the executable lane.
 * @decision Keep the existing import traversal and path normalization in one internal query.
 * @consequence Catalog queries retain cycle detection and repository scope without running suites.
 * @version 1.0.0
 */
import { builtinModules } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const NODE_BUILTIN_SPECIFIERS = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);

const MODULE_SPECIFIER_PATTERNS = [
  /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gu,
  /\bexport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/gu,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
];

export function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function isRelativeOrAbsoluteSpecifier(specifier) {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

function isPackageSpecifier(specifier) {
  return (
    !specifier.startsWith('node:') &&
    !NODE_BUILTIN_SPECIFIERS.has(specifier) &&
    !isRelativeOrAbsoluteSpecifier(specifier)
  );
}

function extractModuleSpecifiers(source) {
  const specifiers = [];
  for (const pattern of MODULE_SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }

  return specifiers;
}

function resolveRelativeModulePath(fromFilePath, specifier, root) {
  if (!isRelativeOrAbsoluteSpecifier(specifier)) {
    return null;
  }

  const fromDir = path.dirname(path.resolve(root, fromFilePath));
  const basePath = specifier.startsWith('/')
    ? path.resolve(root, `.${specifier}`)
    : path.resolve(fromDir, specifier);
  const candidates = path.extname(basePath)
    ? [basePath]
    : [
        `${basePath}.mjs`,
        `${basePath}.cjs`,
        `${basePath}.js`,
        path.join(basePath, 'index.mjs'),
        path.join(basePath, 'index.cjs'),
        path.join(basePath, 'index.js'),
      ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const relativePath = normalizePath(path.relative(root, candidate));
    if (!relativePath.startsWith('..')) {
      return relativePath;
    }
  }

  return null;
}

export function collectPackageSpecifiers(filePath, options = {}) {
  const root = options.repoRootPath ?? repoRoot;
  const visited = options.visited ?? new Set();
  const normalizedFilePath = normalizePath(filePath);

  if (visited.has(normalizedFilePath)) {
    return [];
  }
  visited.add(normalizedFilePath);

  const absolutePath = path.resolve(root, normalizedFilePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  const source = readFileSync(absolutePath, 'utf8');
  const packageSpecifiers = [];
  for (const specifier of extractModuleSpecifiers(source)) {
    if (isPackageSpecifier(specifier)) {
      packageSpecifiers.push(specifier);
      continue;
    }

    const relativeModulePath = resolveRelativeModulePath(normalizedFilePath, specifier, root);
    if (!relativeModulePath) {
      continue;
    }

    packageSpecifiers.push(
      ...collectPackageSpecifiers(relativeModulePath, {
        repoRootPath: root,
        visited,
      })
    );
  }

  return [...new Set(packageSpecifiers)].sort((left, right) => left.localeCompare(right));
}
