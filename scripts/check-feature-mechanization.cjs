#!/usr/bin/env node
/**
 * Owned concern: validate feature mechanization manifests and real implementation diffs.
 *
 * Validate feature mechanization manifests.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { sha256HexUtf8 } = require('@dvt/crypto');
const {
  extractFeatureMechanizationManifests,
} = require('./lib/feature-mechanization-manifest.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const defaultScanRoot = path.join(repoRoot, 'docs', 'planning', 'proposals', 'mandatory');
const allowedMechanizationStatuses = new Set(['closed', 'implemented']);
const allowedRailTypes = new Set(['command', 'query']);

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

class FeatureImplementationGuard {
  constructor(manifestEntries, options = {}) {
    this.manifestEntries = manifestEntries.filter(
      (entry) => entry?.manifest && typeof entry.manifest === 'object'
    );
    this.changedFiles = Array.from(new Set((options.changedFiles || []).map(toPosix))).sort();
    this.deletedFiles = new Set((options.deletedFiles || []).map(toPosix));
    this.currentFiles = Array.from(new Set((options.currentFiles || []).map(toPosix))).sort();
    this.addedLinesByPath = this.normalizePathMap(options.addedLinesByPath || {});
    this.fileContentsByPath = this.normalizePathMap(options.fileContentsByPath || {});
    this.retirementOwnerManifestEntries = null;
  }

  validate() {
    const errors = [];

    this.validateAllowedImplementationSurfaces(errors);
    this.validateForbiddenImplementationSurfaces(errors);
    this.validateDeclaredSymbols(errors);
    this.validateCypressDraftBoundary(errors);

    return { errors };
  }

  normalizePathMap(pathMap) {
    const normalized = new Map();
    for (const [filePath, value] of Object.entries(pathMap)) {
      normalized.set(toPosix(filePath), value);
    }
    return normalized;
  }

  validateAllowedImplementationSurfaces(errors) {
    const allowedPatterns = this.collectSurfacePatterns('allowedImplementationSurfaces');

    for (const filePath of this.changedFiles) {
      if (this.isPermittedRetirement(filePath)) {
        continue;
      }

      if (allowedPatterns.some((pattern) => this.matchesSurface(filePath, pattern))) {
        continue;
      }

      errors.push(
        `${filePath} is outside allowedImplementationSurfaces for selected feature mechanization manifests.`
      );
    }
  }

  validateForbiddenImplementationSurfaces(errors) {
    for (const filePath of this.changedFiles) {
      if (this.isPermittedRetirement(filePath)) {
        continue;
      }

      const forbiddenPatterns = this.collectSurfacePatterns(
        'forbiddenImplementationSurfaces',
        this.findMostSpecificManifestEntriesAllowingFile(filePath)
      );
      const matchingPattern = forbiddenPatterns.find((pattern) =>
        this.matchesSurface(filePath, pattern)
      );
      if (!matchingPattern) {
        continue;
      }

      errors.push(
        `${filePath} matches forbiddenImplementationSurfaces pattern ${matchingPattern.raw}.`
      );
    }
  }

  isPermittedRetirement(filePath) {
    if (!this.deletedFiles.has(filePath)) {
      return false;
    }

    const owningManifestEntries = this.findRetirementOwnerManifestEntries();
    if (owningManifestEntries.length === 0) {
      return false;
    }

    return this.collectSurfacePatterns(
      'forbiddenImplementationSurfaces',
      owningManifestEntries
    ).some(
      (pattern) =>
        this.matchesSurface(filePath, pattern) &&
        !this.currentFiles.some((currentFile) => this.matchesSurface(currentFile, pattern))
    );
  }

  findRetirementOwnerManifestEntries() {
    if (this.retirementOwnerManifestEntries) {
      return this.retirementOwnerManifestEntries;
    }

    const owningFeatureIds = new Set();
    for (const changedFile of this.changedFiles) {
      if (this.deletedFiles.has(changedFile)) {
        continue;
      }

      for (const entry of this.findMostSpecificManifestEntriesAllowingFile(changedFile)) {
        owningFeatureIds.add(entry.manifest.featureId);
      }
    }

    this.retirementOwnerManifestEntries = this.manifestEntries.filter((entry) =>
      owningFeatureIds.has(entry.manifest.featureId)
    );
    return this.retirementOwnerManifestEntries;
  }

  validateDeclaredSymbols(errors) {
    const declaredSymbols = this.collectDeclaredSymbols();

    for (const filePath of this.changedFiles) {
      const addedLines = this.addedLinesByPath.get(filePath) || [];
      const fileContent = this.fileContentsByPath.get(filePath);
      const currentSymbols =
        typeof fileContent === 'string'
          ? new Set(this.extractAddedCodeSymbols(filePath, fileContent.split(/\r?\n/)))
          : null;
      for (const symbolName of this.extractAddedCodeSymbols(filePath, addedLines)) {
        if (currentSymbols && !currentSymbols.has(symbolName)) {
          continue;
        }

        if (declaredSymbols.has(`${filePath}#${symbolName}`)) {
          continue;
        }

        errors.push(
          `${filePath} adds code symbol ${symbolName} that is not declared in feature mechanization symbols.`
        );
      }
    }
  }

  validateCypressDraftBoundary(errors) {
    for (const filePath of this.changedFiles) {
      if (!this.isCypressFile(filePath)) {
        continue;
      }

      const fileContent =
        this.fileContentsByPath.get(filePath) ||
        (this.addedLinesByPath.get(filePath) || []).join('\n');

      if (this.hasWorkspaceGraphDraftIntercept(fileContent)) {
        errors.push(`${filePath} must not use cy.intercept() for /workspace/graph/draft.`);
      }

      if (this.hasDirectWorkspaceGraphDraftPut(fileContent)) {
        errors.push(
          `${filePath} must not issue direct PUT to /workspace/graph/draft; use the UI flow.`
        );
      }
    }
  }

  collectSurfacePatterns(fieldName, manifestEntries = this.manifestEntries) {
    const patterns = [];

    for (const entry of manifestEntries) {
      for (const rawPattern of entry.manifest[fieldName] || []) {
        const normalized = this.normalizeSurfacePattern(rawPattern);
        if (normalized) {
          patterns.push({
            raw: rawPattern,
            normalized,
          });
        }
      }
    }

    return patterns;
  }

  findManifestEntriesAllowingFile(filePath) {
    return this.manifestEntries.filter((entry) =>
      this.collectSurfacePatterns('allowedImplementationSurfaces', [entry]).some((pattern) =>
        this.matchesSurface(filePath, pattern)
      )
    );
  }

  findMostSpecificManifestEntriesAllowingFile(filePath) {
    const matches = this.manifestEntries
      .map((entry) => {
        const matchingAllowedPatterns = this.collectSurfacePatterns(
          'allowedImplementationSurfaces',
          [entry]
        ).filter((pattern) => this.matchesSurface(filePath, pattern));

        if (matchingAllowedPatterns.length === 0) {
          return null;
        }

        return {
          entry,
          specificity: Math.max(
            ...matchingAllowedPatterns.map((pattern) => this.surfacePatternSpecificity(pattern))
          ),
        };
      })
      .filter(Boolean);

    if (matches.length === 0) {
      return [];
    }

    const maxSpecificity = Math.max(...matches.map((match) => match.specificity));

    return matches
      .filter((match) => match.specificity === maxSpecificity)
      .map((match) => match.entry);
  }

  collectDeclaredSymbols() {
    const declaredSymbols = new Set();

    for (const entry of this.manifestEntries) {
      for (const symbol of entry.manifest.symbols || []) {
        if (!isNonEmptyString(symbol?.name) || !isNonEmptyString(symbol?.path)) {
          continue;
        }

        declaredSymbols.add(`${toPosix(symbol.path)}#${symbol.name}`);
      }
    }

    return declaredSymbols;
  }

  normalizeSurfacePattern(rawPattern) {
    if (!isNonEmptyString(rawPattern)) {
      return null;
    }

    return toPosix(rawPattern.trim().split(/\s+/)[0]).replace(/^\.\//, '');
  }

  matchesSurface(filePath, pattern) {
    const normalizedFilePath = toPosix(filePath).replace(/^\.\//, '');
    const normalizedPattern = pattern.normalized.replace(/^\.\//, '');
    const regex = new RegExp(`^${this.globPatternToRegex(normalizedPattern)}$`);

    return regex.test(normalizedFilePath);
  }

  surfacePatternSpecificity(pattern) {
    return pattern.normalized.replace(/\*\*/g, '').replace(/\*/g, '').length;
  }

  globPatternToRegex(pattern) {
    let regex = '';

    for (let index = 0; index < pattern.length; index += 1) {
      const char = pattern[index];
      const nextChar = pattern[index + 1];

      if (char === '*' && nextChar === '*') {
        regex += '.*';
        index += 1;
        continue;
      }

      if (char === '*') {
        regex += '[^/]*';
        continue;
      }

      regex += this.escapeRegex(char);
    }

    return regex;
  }

  escapeRegex(value) {
    return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  }

  extractAddedCodeSymbols(filePath, addedLines) {
    if (!this.isCodeFile(filePath) || this.isTestFile(filePath)) {
      return [];
    }

    const symbols = new Set();

    for (const line of addedLines) {
      if (/^\s/.test(line)) {
        continue;
      }

      const declarationMatch = line.match(
        /^(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)\b/
      );
      if (declarationMatch) {
        symbols.add(declarationMatch[1]);
        continue;
      }

      const constantMatch = line.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/);
      if (constantMatch) {
        symbols.add(constantMatch[1]);
        continue;
      }

      const namedExportMatch = line.match(/^export\s+\{\s*([^}]+)\s*\}/);
      if (!namedExportMatch) {
        continue;
      }

      for (const exportedSymbol of namedExportMatch[1].split(',')) {
        const parts = exportedSymbol.trim().split(/\s+as\s+/);
        const symbolName = parts[1] || parts[0];
        if (/^[A-Za-z_$][\w$]*$/.test(symbolName)) {
          symbols.add(symbolName);
        }
      }
    }

    return Array.from(symbols).sort();
  }

  isCodeFile(filePath) {
    return /\.(?:cjs|mjs|js|jsx|ts|tsx)$/.test(filePath);
  }

  isTestFile(filePath) {
    return (
      /\.(?:test|spec)\.(?:cjs|mjs|js|jsx|ts|tsx)$/.test(filePath) ||
      /(^|\/)(?:__tests__|test|tests|[^/]+-tests)\//.test(filePath)
    );
  }

  isCypressFile(filePath) {
    return /(^|\/)cypress\//.test(filePath) || /\.cy\.(?:js|jsx|ts|tsx)$/.test(filePath);
  }

  hasWorkspaceGraphDraftIntercept(fileContent) {
    return /cy\.intercept\s*\([\s\S]{0,600}workspace\/graph\/draft/.test(fileContent);
  }

  hasDirectWorkspaceGraphDraftPut(fileContent) {
    const positionalPutPattern =
      /cy\.request\s*\(\s*['"`]PUT['"`]\s*,\s*['"`][^'"`]*workspace\/graph\/draft\b/i;
    const objectMethodBeforeUrlPattern =
      /cy\.request\s*\(\s*\{[\s\S]{0,800}method\s*:\s*['"`]PUT['"`][\s\S]{0,800}(?:url|path|pathname)\s*:\s*['"`][^'"`]*workspace\/graph\/draft\b/i;
    const objectUrlBeforeMethodPattern =
      /cy\.request\s*\(\s*\{[\s\S]{0,800}(?:url|path|pathname)\s*:\s*['"`][^'"`]*workspace\/graph\/draft\b[\s\S]{0,800}method\s*:\s*['"`]PUT['"`]/i;

    return (
      positionalPutPattern.test(fileContent) ||
      objectMethodBeforeUrlPattern.test(fileContent) ||
      objectUrlBeforeMethodPattern.test(fileContent)
    );
  }
}

class FeatureMechanizationGitDiffReader {
  constructor(options = {}) {
    this.baseRef = options.baseRef || process.env.GIT_BASE || 'origin/main';
    this.repoRootPath = options.repoRootPath || repoRoot;
    this.lastUntrackedFiles = new Set();
  }

  read() {
    const changedFiles = this.readChangedFiles();

    return {
      changedFiles,
      currentFiles: this.readCurrentFiles(),
      deletedFiles: this.readDeletedFiles(changedFiles),
      addedLinesByPath: this.readAddedLinesByPath(changedFiles),
      fileContentsByPath: this.readFileContentsByPath(changedFiles),
    };
  }

  readDeletedFiles(changedFiles) {
    return changedFiles.filter((filePath) => {
      if (this.lastUntrackedFiles.has(filePath)) {
        return false;
      }

      return !fs.existsSync(path.join(this.repoRootPath, filePath));
    });
  }

  readCurrentFiles() {
    return this.readGitLines(['ls-files', '--cached', '--others', '--exclude-standard'])
      .filter((filePath) => fs.existsSync(path.join(this.repoRootPath, filePath)))
      .sort();
  }

  readChangedFiles() {
    const changedFiles = new Set();
    const nameOnlyCommands = [
      ['diff', '--name-only', '--diff-filter=ACMRD', `${this.baseRef}...HEAD`],
      ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'],
      ['diff', '--name-only', '--diff-filter=ACMRD'],
    ];

    for (const command of nameOnlyCommands) {
      for (const filePath of this.readGitLines(command)) {
        changedFiles.add(toPosix(filePath));
      }
    }

    const untrackedFiles = this.readGitLines(['ls-files', '--others', '--exclude-standard']).map(
      toPosix
    );
    this.lastUntrackedFiles = new Set(untrackedFiles);
    for (const filePath of untrackedFiles) {
      changedFiles.add(filePath);
    }

    return Array.from(changedFiles).sort();
  }

  readAddedLinesByPath(changedFiles) {
    const addedLinesByPath = {};
    const diffCommands = [
      ['diff', '--unified=0', '--no-ext-diff', '--diff-filter=ACMRD', `${this.baseRef}...HEAD`],
      ['diff', '--cached', '--unified=0', '--no-ext-diff', '--diff-filter=ACMRD'],
      ['diff', '--unified=0', '--no-ext-diff', '--diff-filter=ACMRD'],
    ];

    for (const command of diffCommands) {
      this.mergeAddedLines(addedLinesByPath, this.parseAddedLines(this.runGit(command)));
    }

    for (const filePath of changedFiles) {
      const absolutePath = path.join(this.repoRootPath, filePath);
      if (this.lastUntrackedFiles.has(filePath) && fs.existsSync(absolutePath)) {
        addedLinesByPath[filePath] = fs.readFileSync(absolutePath, 'utf8').split(/\r?\n/);
        continue;
      }

      if (fs.existsSync(absolutePath) && !addedLinesByPath[filePath]) {
        addedLinesByPath[filePath] = [];
      }
    }

    return addedLinesByPath;
  }

  readFileContentsByPath(changedFiles) {
    const fileContentsByPath = {};

    for (const filePath of changedFiles) {
      const absolutePath = path.join(this.repoRootPath, filePath);
      if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
        fileContentsByPath[filePath] = fs.readFileSync(absolutePath, 'utf8');
      }
    }

    return fileContentsByPath;
  }

  readGitLines(args) {
    return this.runGit(args)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  runGit(args) {
    try {
      return execFileSync('git', args, {
        cwd: this.repoRootPath,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      return '';
    }
  }

  parseAddedLines(diffText) {
    const addedLinesByPath = {};
    let currentFilePath = null;

    for (const line of diffText.split(/\r?\n/)) {
      if (line.startsWith('+++ b/')) {
        currentFilePath = toPosix(line.slice('+++ b/'.length));
        addedLinesByPath[currentFilePath] ||= [];
        continue;
      }

      if (!currentFilePath || !line.startsWith('+') || line.startsWith('+++')) {
        continue;
      }

      addedLinesByPath[currentFilePath].push(line.slice(1));
    }

    return addedLinesByPath;
  }

  mergeAddedLines(target, source) {
    for (const [filePath, addedLines] of Object.entries(source)) {
      target[filePath] ||= [];
      target[filePath].push(...addedLines);
    }
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function listMarkdownFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function readFeatureMechanizationDocs(scanRoot = defaultScanRoot) {
  return listMarkdownFiles(scanRoot).map((filePath) => ({
    path: toPosix(path.relative(repoRoot, filePath)),
    content: fs.readFileSync(filePath, 'utf8'),
  }));
}

function pushMissingObjectField(errors, owner, field, value) {
  if (!isNonEmptyString(value)) {
    errors.push(`${owner} missing ${field}.`);
  }
}

function pushMissingArrayField(errors, owner, field, value) {
  if (!isNonEmptyArray(value)) {
    errors.push(`${owner} missing ${field}.`);
  }
}

function validateCommandQueryRails(manifest, sourcePath, errors) {
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'commandQueryRails',
    manifest.commandQueryRails
  );

  for (const [index, rail] of (manifest.commandQueryRails || []).entries()) {
    const owner = `${sourcePath} feature ${manifest.featureId} commandQueryRails[${index}]`;
    pushMissingObjectField(errors, owner, 'name', rail?.name);
    pushMissingObjectField(errors, owner, 'dddOwner', rail?.dddOwner);

    if (!allowedRailTypes.has(rail?.type)) {
      errors.push(
        `${owner} has invalid type ${rail?.type || '<missing>'}; expected command or query.`
      );
    }
  }
}

function validateRedGreenCycles(manifest, sourcePath, errors) {
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'redGreenCycles',
    manifest.redGreenCycles
  );

  for (const [index, cycle] of (manifest.redGreenCycles || []).entries()) {
    const owner = `${sourcePath} feature ${manifest.featureId} redGreenCycles[${index}]`;
    pushMissingObjectField(errors, owner, 'id', cycle?.id);
    pushMissingObjectField(errors, owner, 'redTest', cycle?.redTest);
    pushMissingObjectField(errors, owner, 'expectedFailure', cycle?.expectedFailure);
    pushMissingArrayField(errors, owner, 'patchSurfaces', cycle?.patchSurfaces);
    pushMissingObjectField(errors, owner, 'greenTest', cycle?.greenTest);
  }
}

function validateSymbols(manifest, sourcePath, errors) {
  if (manifest.mechanizationStatus !== 'closed') {
    pushMissingArrayField(
      errors,
      `${sourcePath} feature ${manifest.featureId}`,
      'symbols',
      manifest.symbols
    );
  }

  for (const [index, symbol] of (manifest.symbols || []).entries()) {
    const owner = `${sourcePath} feature ${manifest.featureId} symbols[${index}]`;
    pushMissingObjectField(errors, owner, 'name', symbol?.name);
    pushMissingObjectField(errors, owner, 'path', symbol?.path);
    pushMissingObjectField(errors, owner, 'dddOwner', symbol?.dddOwner);
    pushMissingArrayField(errors, owner, 'cqRails', symbol?.cqRails);
    pushMissingArrayField(errors, owner, 'fowlerSignals', symbol?.fowlerSignals);
    pushMissingObjectField(errors, owner, 'architectureGuard', symbol?.architectureGuard);
    pushMissingObjectField(errors, owner, 'cypressCoverage', symbol?.cypressCoverage);
    pushMissingArrayField(errors, owner, 'unitTests', symbol?.unitTests);
  }
}

function validateFeatureMechanizationManifest(manifest, sourcePath) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { errors: [`${sourcePath} feature mechanization manifest must be a YAML object.`] };
  }

  if (manifest.version !== 1) {
    errors.push(`${sourcePath} feature mechanization manifest must set version to 1.`);
  }

  pushMissingObjectField(errors, sourcePath, 'featureId', manifest.featureId);

  if (!allowedMechanizationStatuses.has(manifest.mechanizationStatus)) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId || '<missing>'} must set mechanizationStatus to closed or implemented.`
    );
  }

  if (manifest.noHumanDecisionsRemaining !== true) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId || '<missing>'} must set noHumanDecisionsRemaining to true.`
    );
  }

  pushMissingObjectField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'implementationPlan',
    manifest.implementationPlan
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'componentGuides',
    manifest.componentGuides
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'userStories',
    manifest.userStories
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'governingSources',
    manifest.governingSources
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'allowedImplementationSurfaces',
    manifest.allowedImplementationSurfaces
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'forbiddenImplementationSurfaces',
    manifest.forbiddenImplementationSurfaces
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'domainObjects',
    manifest.domainObjects
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'fowlerSignals',
    manifest.fowlerSignals
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'architectureGuards',
    manifest.architectureGuards
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'cypressFlows',
    manifest.cypressFlows
  );
  pushMissingArrayField(
    errors,
    `${sourcePath} feature ${manifest.featureId}`,
    'completionGate',
    manifest.completionGate
  );

  if (
    isNonEmptyArray(manifest.governingSources) &&
    !manifest.governingSources.includes('docs/architecture/command-query-rail-governance.md')
  ) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId} must cite command-query rail governance.`
    );
  }

  if (
    isNonEmptyArray(manifest.governingSources) &&
    !manifest.governingSources.includes(
      'docs/architecture/fowler-opportunity-planning-governance.md'
    )
  ) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId} must cite Fowler opportunity planning governance.`
    );
  }

  if (
    isNonEmptyArray(manifest.completionGate) &&
    !manifest.completionGate.some((command) => command === 'pnpm verify:prepush')
  ) {
    errors.push(
      `${sourcePath} feature ${manifest.featureId} completionGate must include pnpm verify:prepush.`
    );
  }

  validateCommandQueryRails(manifest, sourcePath, errors);
  validateRedGreenCycles(manifest, sourcePath, errors);
  validateSymbols(manifest, sourcePath, errors);

  return { errors };
}

function validateFeatureMechanizationDocs(docs, options = {}) {
  const errors = [];
  const manifests = [];
  const requiredFeatureIds = new Set(options.requiredFeatureIds || []);

  for (const doc of docs) {
    for (const extracted of extractFeatureMechanizationManifests(doc.content, doc.path)) {
      if (extracted.parseError) {
        errors.push(
          `${extracted.sourcePath} feature mechanization manifest parse error: ${extracted.parseError}`
        );
        continue;
      }

      manifests.push(extracted);
      errors.push(
        ...validateFeatureMechanizationManifest(extracted.manifest, extracted.sourcePath).errors
      );
    }
  }

  for (const featureId of requiredFeatureIds) {
    if (!manifests.some((entry) => entry.manifest?.featureId === featureId)) {
      errors.push(`Required feature ${featureId} has no feature mechanization manifest.`);
    }
  }

  return {
    errors,
    manifestEntries: manifests,
    manifestCount: manifests.length,
    features: manifests
      .map((entry) => entry.manifest?.featureId)
      .filter((featureId) => typeof featureId === 'string'),
  };
}

function validateFeatureMechanizationManifestEntries(manifestEntries, options = {}) {
  const errors = [];
  const manifests = [];
  const requiredFeatureIds = new Set(options.requiredFeatureIds || []);

  for (const entry of manifestEntries || []) {
    manifests.push(entry);
    errors.push(...validateFeatureMechanizationManifest(entry.manifest, entry.sourcePath).errors);
  }

  for (const featureId of requiredFeatureIds) {
    if (!manifests.some((entry) => entry.manifest?.featureId === featureId)) {
      errors.push(`Required feature ${featureId} has no feature mechanization manifest.`);
    }
  }

  return {
    errors,
    manifestEntries: manifests,
    manifestCount: manifests.length,
    features: manifests
      .map((entry) => entry.manifest?.featureId)
      .filter((featureId) => typeof featureId === 'string'),
  };
}

function validateFeatureImplementationManifests(manifestEntries, options = {}) {
  return new FeatureImplementationGuard(manifestEntries, options).validate();
}

function normalizeDbFeatureMechanizationManifestRows(rows) {
  function stableJsonStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map(stableJsonStringify).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableJsonStringify(value[key])}`)
        .join(',')}}`;
    }

    return JSON.stringify(value);
  }

  function mergeManifestArrayValues(leftValue, rightValue) {
    const mergedValues = [];
    const seenValues = new Set();

    for (const value of [
      ...(Array.isArray(leftValue) ? leftValue : []),
      ...(Array.isArray(rightValue) ? rightValue : []),
    ]) {
      const key = stableJsonStringify(value);
      if (seenValues.has(key)) {
        continue;
      }

      seenValues.add(key);
      mergedValues.push(value);
    }

    return mergedValues;
  }

  function mergeFeatureMechanizationManifest(leftManifest, rightManifest) {
    const mergedManifest = { ...leftManifest };

    for (const [fieldName, fieldValue] of Object.entries(rightManifest)) {
      if (Array.isArray(fieldValue)) {
        mergedManifest[fieldName] = mergeManifestArrayValues(mergedManifest[fieldName], fieldValue);
        continue;
      }

      if (
        mergedManifest[fieldName] === undefined ||
        mergedManifest[fieldName] === null ||
        mergedManifest[fieldName] === ''
      ) {
        mergedManifest[fieldName] = fieldValue;
      }
    }

    return mergedManifest;
  }

  const bySourceAndFeature = new Map();

  for (const row of rows || []) {
    const sourcePath = toPosix(row.source_path || row.sourcePath || '');
    const manifest = row.raw_manifest || row.rawManifest;
    const featureId = manifest?.featureId;
    if (!sourcePath || !featureId || !manifest || typeof manifest !== 'object') {
      continue;
    }

    const key = `${sourcePath}#${featureId}`;
    if (bySourceAndFeature.has(key)) {
      const existingEntry = bySourceAndFeature.get(key);
      existingEntry.manifest = mergeFeatureMechanizationManifest(existingEntry.manifest, manifest);
      continue;
    }

    bySourceAndFeature.set(key, {
      sourcePath,
      manifest,
    });
  }

  return Array.from(bySourceAndFeature.values()).sort((left, right) =>
    `${left.sourcePath}#${left.manifest.featureId}`.localeCompare(
      `${right.sourcePath}#${right.manifest.featureId}`
    )
  );
}

async function readFeatureMechanizationManifestsFromDb(options = {}) {
  const deps = {
    Client: require('pg').Client,
    runPlanningImport: require('./planning-db-import.cjs').runPlanningImport,
    ...options.deps,
  };
  const connectionString =
    options.databaseUrl ||
    process.env.DVT_PLANNING_DB_URL ||
    process.env.PLANNING_DATABASE_URL ||
    process.env.DATABASE_URL ||
    defaultPgUrl;

  const client = options.client || new deps.Client({ connectionString });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    if (options.refresh !== false) {
      const changedFeatureDocs =
        options.changedFeatureMechanizationSourcePaths ||
        readChangedFeatureMechanizationSourcePaths({
          baseRef: options.baseRef,
          changedFiles: options.changedFiles,
        });
      const currentSourceHashes =
        options.currentSourceHashes || readCurrentSourceHashes(changedFeatureDocs);

      if (await shouldRefreshFeatureMechanizationManifestDb(client, currentSourceHashes)) {
        await deps.runPlanningImport(
          {
            databaseUrl: connectionString,
            ifStale: false,
            silent: true,
          },
          {
            logger: {
              log() {},
            },
          }
        );
      }
    }

    const result = await client.query(`
      with db_feature_manifest_rows as (
        select
          rail_id,
          source_path,
          raw_manifest,
          rail_source,
          imported_at,
          1 as projection_priority
        from planning_query_store.command_query_rail_manifest_query
        where raw_manifest ? 'featureId'
          and rail_id not like 'current#rail-decision#%'
        union all
        select
          rail_id,
          source_path,
          raw_manifest,
          'local'::text as rail_source,
          updated_at as imported_at,
          0 as projection_priority
        from planning_query_store.feature_mechanization_local_rails
        where raw_manifest ? 'featureId'
          and rail_id not like 'current#rail-decision#%'
      ),
      ranked_manifest_rows as (
        select
          source_path,
          raw_manifest,
          rail_source,
          imported_at,
          rail_id,
          row_number() over (
            partition by rail_id
            order by projection_priority, imported_at desc
          ) as projection_rank
        from db_feature_manifest_rows
      )
      select
        source_path,
        raw_manifest
      from ranked_manifest_rows
      where projection_rank = 1
      order by source_path, raw_manifest->>'featureId', rail_source, imported_at, rail_id
    `);
    return normalizeDbFeatureMechanizationManifestRows(result.rows);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function isFeatureMechanizationSourcePath(sourcePath) {
  const normalizedPath = toPosix(sourcePath);
  return (
    normalizedPath.startsWith('docs/planning/proposals/mandatory/') &&
    normalizedPath.endsWith('.md')
  );
}

function hasFeatureMechanizationManifestFence(sourcePath) {
  const absolutePath = path.join(repoRoot, sourcePath);
  return (
    fs.existsSync(absolutePath) &&
    /```feature-mechanization\b/.test(fs.readFileSync(absolutePath, 'utf8'))
  );
}

function readChangedFeatureMechanizationSourcePaths(options = {}) {
  const changedFiles =
    options.changedFiles ||
    new FeatureMechanizationGitDiffReader({ baseRef: options.baseRef }).readChangedFiles();

  return changedFiles
    .map(toPosix)
    .filter(isFeatureMechanizationSourcePath)
    .filter(hasFeatureMechanizationManifestFence)
    .sort();
}

function readCurrentSourceHashes(sourcePaths) {
  const sourceHashes = new Map();

  for (const sourcePath of sourcePaths) {
    const absolutePath = path.join(repoRoot, sourcePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    sourceHashes.set(sourcePath, sha256HexUtf8(fs.readFileSync(absolutePath, 'utf8')));
  }

  return sourceHashes;
}

async function shouldRefreshFeatureMechanizationManifestDb(client, currentSourceHashes) {
  if (currentSourceHashes.size === 0) {
    const result = await client.query(`
      select count(*)::int as manifest_count
      from planning_query_store.command_query_rails
      where raw_manifest ? 'featureId'
    `);
    return Number(result.rows[0]?.manifest_count || 0) === 0;
  }

  const sourcePaths = [...currentSourceHashes.keys()];
  const result = await client.query(
    `
      select distinct
        source_path,
        source_content_sha256
      from planning_query_store.command_query_rails
      where raw_manifest ? 'featureId'
        and source_path = any($1::text[])
    `,
    [sourcePaths]
  );
  const dbHashes = new Map(
    result.rows.map((row) => [
      toPosix(row.source_path || row.sourcePath),
      row.source_content_sha256 || row.sourceContentSha256,
    ])
  );

  return sourcePaths.some(
    (sourcePath) => dbHashes.get(sourcePath) !== currentSourceHashes.get(sourcePath)
  );
}

function parseArgs(argv) {
  const requiredFeatureIds = [];
  let scanRoot = defaultScanRoot;
  let implementation = false;
  let baseRef = process.env.GIT_BASE || 'origin/main';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--implementation') {
      implementation = true;
      continue;
    }

    if (arg === '--base') {
      const requestedBaseRef = argv[index + 1];
      if (!requestedBaseRef) {
        throw new Error('--base requires a Git ref.');
      }
      baseRef = requestedBaseRef;
      index += 1;
      continue;
    }

    if (arg === '--feature') {
      const featureId = argv[index + 1];
      if (!featureId) {
        throw new Error('--feature requires a feature id.');
      }
      requiredFeatureIds.push(featureId);
      index += 1;
      continue;
    }

    if (arg === '--scan-root') {
      const requestedScanRoot = argv[index + 1];
      if (!requestedScanRoot) {
        throw new Error('--scan-root requires a path.');
      }
      scanRoot = path.resolve(repoRoot, requestedScanRoot);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    baseRef,
    implementation,
    requiredFeatureIds,
    scanRoot,
  };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[docs:feature-mechanization] ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (args.implementation) {
    const requiredFeatureIds = new Set(args.requiredFeatureIds);
    let manifestEntries;
    let result;
    try {
      manifestEntries = await readFeatureMechanizationManifestsFromDb({ baseRef: args.baseRef });
      result = validateFeatureMechanizationManifestEntries(manifestEntries, {
        requiredFeatureIds: args.requiredFeatureIds,
      });
    } catch (error) {
      const nestedMessages = Array.isArray(error?.errors)
        ? error.errors
            .map((nestedError) => nestedError?.message || nestedError?.code || nestedError?.name)
            .filter(Boolean)
        : [];
      const message =
        [error?.message, error?.code, ...nestedMessages].filter(Boolean).join('; ') ||
        String(error);
      result = {
        errors: [`[db-first] Could not read feature mechanization manifests from DB: ${message}`],
        manifestEntries: [],
        manifestCount: 0,
        features: [],
      };
      manifestEntries = [];
    }

    const allErrors = [...result.errors];
    const selectedManifestEntries =
      requiredFeatureIds.size === 0
        ? manifestEntries
        : manifestEntries.filter((entry) => requiredFeatureIds.has(entry.manifest.featureId));
    const diff = new FeatureMechanizationGitDiffReader({ baseRef: args.baseRef }).read();
    const implementationResult = validateFeatureImplementationManifests(
      selectedManifestEntries,
      diff
    );

    allErrors.push(...implementationResult.errors);

    if (allErrors.length > 0) {
      console.error('[docs:feature-mechanization] FAILED');
      for (const error of allErrors) {
        console.error(`- ${error}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`[docs:feature-mechanization] OK (${result.manifestCount} DB manifest(s))`);
    return;
  }

  const result = validateFeatureMechanizationDocs(readFeatureMechanizationDocs(args.scanRoot), {
    requiredFeatureIds: args.requiredFeatureIds,
  });
  const allErrors = [...result.errors];

  if (allErrors.length > 0) {
    console.error('[docs:feature-mechanization] FAILED');
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `[docs:feature-mechanization] OK (${result.manifestCount} manifest(s): ${result.features.join(', ') || 'none'})`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[docs:feature-mechanization] ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}

module.exports = {
  FeatureImplementationGuard,
  FeatureMechanizationGitDiffReader,
  extractFeatureMechanizationManifests,
  normalizeDbFeatureMechanizationManifestRows,
  readChangedFeatureMechanizationSourcePaths,
  readFeatureMechanizationDocs,
  readFeatureMechanizationManifestsFromDb,
  shouldRefreshFeatureMechanizationManifestDb,
  validateFeatureImplementationManifests,
  validateFeatureMechanizationDocs,
  validateFeatureMechanizationManifestEntries,
  validateFeatureMechanizationManifest,
};
