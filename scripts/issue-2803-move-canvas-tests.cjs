const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();
const canvasDir = path.join(repoRoot, 'apps/web/src/app/views/canvas');
const testsDir = path.join(canvasDir, '__tests__');
const workflowPath = path.join(repoRoot, '.github/workflows/issue-2803-canvas-tests-layout.yml');
const scriptPath = path.join(repoRoot, 'scripts/issue-2803-move-canvas-tests.cjs');

const testFilePattern = /\.test\.(?:ts|tsx)$/;
const sourceFiles = fs
  .readdirSync(canvasDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && testFilePattern.test(entry.name))
  .map((entry) => path.join(canvasDir, entry.name))
  .sort();

if (sourceFiles.length === 0) {
  throw new Error('Issue #2803 migration found no top-level Canvas tests to move.');
}

fs.mkdirSync(testsDir, { recursive: true });

const moveMap = new Map(
  sourceFiles.map((sourcePath) => [sourcePath, path.join(testsDir, path.basename(sourcePath))])
);

const knownExtensions = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs'];
const withoutKnownExtension = (filePath) => {
  const extension = knownExtensions.find((candidate) => filePath.endsWith(candidate));
  return extension == null ? filePath : filePath.slice(0, -extension.length);
};

const movedTargetFor = (absoluteTarget) => {
  for (const [oldPath, newPath] of moveMap.entries()) {
    if (oldPath === absoluteTarget) return newPath;
    if (withoutKnownExtension(oldPath) === absoluteTarget) return withoutKnownExtension(newPath);
  }
  return absoluteTarget;
};

const toPosixRelativeSpecifier = (fromFile, targetPath) => {
  let relative = path.relative(path.dirname(fromFile), targetPath).split(path.sep).join('/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
};

const rewriteSpecifier = (specifier, oldFile, newFile) => {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return specifier;
  const oldAbsoluteTarget = path.resolve(path.dirname(oldFile), specifier);
  const target = movedTargetFor(oldAbsoluteTarget);
  return toPosixRelativeSpecifier(newFile, target);
};

const rewriteModuleSpecifiers = (content, oldFile, newFile) => {
  const patterns = [
    /(\bfrom\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
    /(\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
    /(\bimport\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
    /(\b(?:require|vi\.mock|vi\.doMock|vi\.unmock)\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
  ];

  return patterns.reduce(
    (current, pattern) =>
      current.replace(pattern, (match, prefix, quote, specifier) => {
        const rewritten = rewriteSpecifier(specifier, oldFile, newFile);
        return `${prefix}${quote}${rewritten}${quote}`;
      }),
    content
  );
};

for (const sourcePath of sourceFiles) {
  const destinationPath = moveMap.get(sourcePath);
  const original = fs.readFileSync(sourcePath, 'utf8');
  const rewritten = rewriteModuleSpecifiers(original, sourcePath, destinationPath);
  fs.writeFileSync(destinationPath, rewritten);
  fs.unlinkSync(sourcePath);
}

const remainingTopLevelTests = fs
  .readdirSync(canvasDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && testFilePattern.test(entry.name));
if (remainingTopLevelTests.length !== 0) {
  throw new Error(`Top-level Canvas tests remain: ${remainingTopLevelTests.map((entry) => entry.name).join(', ')}`);
}

const movedTests = fs
  .readdirSync(testsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && testFilePattern.test(entry.name));
if (movedTests.length !== sourceFiles.length) {
  throw new Error(`Expected ${sourceFiles.length} moved tests, found ${movedTests.length}.`);
}

// The automation is intentionally one-shot: keep no migration framework or CI mechanism in the final tree.
if (fs.existsSync(workflowPath)) fs.unlinkSync(workflowPath);
if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);

console.log(`issue-2803: moved ${sourceFiles.length} Canvas tests into __tests__/`);
console.log('issue-2803: top-level Canvas test files after migration: 0');
