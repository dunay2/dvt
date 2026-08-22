const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { sha256HexUtf8 } = require('@dvt/crypto');

const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const ignoredDirectoryNames = new Set([
  '.git',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
]);
const ignoredRepoPathPrefixes = ['.generated-docs', 'buzon', 'docs', 'infra/prototypes'];

function toRepoPath(filePath, rootDir) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function normalizeRepoPath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '');
}

function isIgnoredRepoPath(repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  return ignoredRepoPathPrefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

function isSourceFile(filePath) {
  return sourceExtensions.includes(path.extname(filePath));
}

function isTestPath(repoPath) {
  return (
    /(^|\/)(__tests__|test|tests)(\/|$)/.test(repoPath) ||
    /\b(test|spec)\.[cm]?[jt]sx?$/.test(repoPath)
  );
}

function listSourceFiles(rootDir, currentDir = rootDir, files = [], repoRoot = rootDir) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const entryPath = path.join(currentDir, entry.name);
    if (isIgnoredRepoPath(toRepoPath(entryPath, repoRoot))) {
      continue;
    }

    if (entry.isDirectory()) {
      if (!ignoredDirectoryNames.has(entry.name)) {
        listSourceFiles(rootDir, entryPath, files, repoRoot);
      }
      continue;
    }

    if (entry.isFile() && isSourceFile(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) =>
    toRepoPath(left, repoRoot).localeCompare(toRepoPath(right, repoRoot))
  );
}

function readPackageMap(rootDir) {
  const packages = [];
  for (const packageJsonPath of findPackageJsonFiles(rootDir)) {
    const packageRoot = path.dirname(packageJsonPath);
    try {
      const manifest = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (typeof manifest.name === 'string' && manifest.name.trim().length > 0) {
        packages.push({
          name: manifest.name,
          rootDir: packageRoot,
          sourceDir: resolveExistingPath(packageRoot, ['src', 'lib']) || packageRoot,
        });
      }
    } catch {
      // Invalid package manifests are ignored by the read-only scanner.
    }
  }

  return packages.sort((left, right) => right.name.length - left.name.length);
}

function findPackageJsonFiles(rootDir, currentDir = rootDir, files = []) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const entryPath = path.join(currentDir, entry.name);
    if (isIgnoredRepoPath(toRepoPath(entryPath, rootDir))) {
      continue;
    }

    if (entry.isDirectory()) {
      if (!ignoredDirectoryNames.has(entry.name)) {
        findPackageJsonFiles(rootDir, entryPath, files);
      }
      continue;
    }

    if (entry.isFile() && entry.name === 'package.json') {
      files.push(entryPath);
    }
  }

  return files;
}

function resolveExistingPath(baseDir, candidates) {
  for (const candidate of candidates) {
    const candidatePath = path.join(baseDir, candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

function parseImports(sourceText, filePath) {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const imports = [];

  function addImportLiteral(node, literalNode) {
    if (literalNode && ts.isStringLiteralLike(literalNode)) {
      imports.push({
        importLiteral: literalNode.text,
        position: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      });
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addImportLiteral(node, node.moduleSpecifier);
    } else if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const [firstArg] = node.arguments;
      if (expression.kind === ts.SyntaxKind.ImportKeyword) {
        addImportLiteral(node, firstArg);
      } else if (
        ts.isIdentifier(expression) &&
        expression.text === 'require' &&
        firstArg &&
        ts.isStringLiteralLike(firstArg)
      ) {
        addImportLiteral(node, firstArg);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

function resolveImportTarget(rootDir, sourceFilePath, importLiteral, packageMap) {
  if (importLiteral.startsWith('.')) {
    return resolveRelativeImport(sourceFilePath, importLiteral);
  }

  const packageMatch = packageMap.find(
    (entry) => importLiteral === entry.name || importLiteral.startsWith(`${entry.name}/`)
  );
  if (!packageMatch) {
    return { targetPath: null, mappingState: 'external' };
  }

  const subpath =
    importLiteral === packageMatch.name ? '' : importLiteral.slice(packageMatch.name.length + 1);
  const resolved = resolveAsSourceFile(path.join(packageMatch.sourceDir, subpath));
  return {
    targetPath: resolved
      ? toRepoPath(resolved, rootDir)
      : toRepoPath(packageMatch.sourceDir, rootDir),
    mappingState: resolved || packageMatch.sourceDir ? 'mapped' : 'unmapped',
  };
}

function resolveRelativeImport(sourceFilePath, importLiteral) {
  const targetBase = path.resolve(path.dirname(sourceFilePath), importLiteral);
  const resolved = resolveAsSourceFile(targetBase);
  return {
    targetPath: resolved ? normalizeRepoPath(path.relative(process.cwd(), resolved)) : null,
    mappingState: resolved ? 'mapped' : 'unmapped',
    absolutePath: resolved,
  };
}

function resolveAsSourceFile(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  for (const extension of sourceExtensions) {
    const filePath = `${basePath}${extension}`;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const extension of sourceExtensions) {
      const indexPath = path.join(basePath, `index${extension}`);
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return indexPath;
      }
    }
  }

  return null;
}

function mapPathToComponent(repoPath, components) {
  if (!repoPath) {
    return {
      componentId: null,
      mappingState: 'external',
      confidence: 1,
      reason: 'No repository target path was resolved.',
    };
  }

  const normalizedPath = normalizeRepoPath(repoPath);
  const matches = components
    .map((component) => ({
      componentId: component.component_id ?? component.componentId,
      repoPath: normalizeRepoPath(component.repo_path ?? component.repoPath),
    }))
    .filter((component) => {
      return (
        component.repoPath.length > 0 &&
        (normalizedPath === component.repoPath ||
          normalizedPath.startsWith(`${component.repoPath}/`))
      );
    })
    .sort((left, right) => right.repoPath.length - left.repoPath.length);

  if (matches.length === 0) {
    return {
      componentId: null,
      mappingState: 'unmapped',
      confidence: 0,
      reason: `No architecture component owns ${normalizedPath}.`,
    };
  }

  const bestLength = matches[0].repoPath.length;
  const bestMatches = matches.filter((match) => match.repoPath.length === bestLength);
  if (bestMatches.length > 1) {
    return {
      componentId: bestMatches[0].componentId,
      mappingState: 'ambiguous',
      confidence: 0.5,
      reason: `${normalizedPath} matches multiple equally specific components.`,
    };
  }

  return {
    componentId: matches[0].componentId,
    mappingState: 'mapped',
    confidence: 1,
    reason: `${normalizedPath} maps to ${matches[0].componentId}.`,
  };
}

function classifyObservation(observation, relations) {
  if (observation.sourceMappingState === 'unmapped') {
    return 'unmapped_source';
  }
  if (observation.targetMappingState === 'unmapped') {
    return 'unmapped_target';
  }
  if (
    observation.sourceMappingState === 'ambiguous' ||
    observation.targetMappingState === 'ambiguous'
  ) {
    return 'ambiguous_mapping';
  }
  if (observation.targetMappingState === 'external') {
    return 'external_dependency';
  }
  if (
    observation.sourceComponentId &&
    observation.sourceComponentId === observation.targetComponentId
  ) {
    return 'self_dependency';
  }

  const declared = relations.some(
    (relation) =>
      relation.source_component_id === observation.sourceComponentId &&
      relation.target_component_id === observation.targetComponentId &&
      relation.relation_type === observation.relationType &&
      ['approved', 'implemented'].includes(relation.status)
  );
  if (declared) {
    return 'declared';
  }

  const reverseDeclared = relations.some(
    (relation) =>
      relation.source_component_id === observation.targetComponentId &&
      relation.target_component_id === observation.sourceComponentId &&
      relation.relation_type === observation.relationType &&
      ['approved', 'implemented'].includes(relation.status)
  );

  return reverseDeclared ? 'reverse_declared' : 'undeclared_dependency';
}

function buildEvaluations({ scanId, designId, observations, relations }) {
  const classifications = observations.map((observation) =>
    classifyObservation(observation, relations)
  );
  const has = (classification) => classifications.includes(classification);

  return [
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-001',
      state: has('unmapped_source') ? 'fail' : 'pass',
      severity: has('unmapped_source') ? 'error' : 'info',
      reason: has('unmapped_source')
        ? 'At least one source path is not mapped to an architecture component.'
        : 'All observed source paths map to architecture components.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-002',
      state: has('unmapped_target') || has('ambiguous_mapping') ? 'fail' : 'pass',
      severity: has('unmapped_target') || has('ambiguous_mapping') ? 'error' : 'info',
      reason: 'Target paths must map to one component, be external, or be explicitly classified.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-003',
      state: has('undeclared_dependency') ? 'fail' : 'pass',
      severity: has('undeclared_dependency') ? 'error' : 'info',
      reason: 'Observed internal dependencies must be declared in architecture.component_relation.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-004',
      state: has('reverse_declared') ? 'fail' : 'pass',
      severity: has('reverse_declared') ? 'error' : 'info',
      reason: 'Observed dependencies must not rely on reverse-only declared relations.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-005',
      state: 'pass',
      severity: 'info',
      reason: 'Self-component dependencies are classified separately from cross-component drift.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-006',
      state: observations.length > 0 ? 'pass' : 'warning',
      severity: observations.length > 0 ? 'info' : 'warning',
      reason: 'Scanner must produce dependency observations for the selected repository surface.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-007',
      state: 'pass',
      severity: 'info',
      reason: 'Observations distinguish test files from source files.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-008',
      state: observations.every((observation) =>
        /^[a-f0-9]{64}$/.test(observation.sourceContentSha256)
      )
        ? 'pass'
        : 'fail',
      severity: 'error',
      reason: 'Every observation must retain the scanned source file hash.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-009',
      state: designId ? 'pass' : 'fail',
      severity: designId ? 'info' : 'blocker',
      reason: 'Architecture fitness scans must be tied to an architecture design.',
    }),
    ruleEvaluation({
      scanId,
      designId,
      ruleId: 'DVT-ARCH-010',
      state: has('ambiguous_mapping') ? 'fail' : 'pass',
      severity: has('ambiguous_mapping') ? 'error' : 'info',
      reason: 'Component path mapping must not be ambiguous.',
    }),
  ];
}

function ruleEvaluation({ scanId, designId, ruleId, state, severity, reason }) {
  return {
    evaluationId: `${scanId}-${ruleId}`,
    scanId,
    designId,
    fitnessRuleId: ruleId,
    subjectKind: 'scan',
    subjectId: scanId,
    resultState: state,
    severity,
    reason,
    evidence: {},
  };
}

function runArchitectureFitnessScan(options) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const repoRoot = path.resolve(options.repoRoot || rootDir);
  const scanId = options.scanId;
  const designId = options.designId;
  const components = options.components || [];
  const relations = options.relations || [];
  const packageMap = readPackageMap(repoRoot);
  const observations = [];

  for (const filePath of listSourceFiles(rootDir, rootDir, [], repoRoot)) {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceRepoPath = toRepoPath(filePath, repoRoot);
    const sourceMapping = mapPathToComponent(sourceRepoPath, components);
    for (const importInfo of parseImports(sourceText, filePath)) {
      const resolved = resolveImportTarget(
        repoRoot,
        filePath,
        importInfo.importLiteral,
        packageMap
      );
      const targetRepoPath = resolved.absolutePath
        ? toRepoPath(resolved.absolutePath, repoRoot)
        : resolved.targetPath;
      const targetMapping =
        resolved.mappingState === 'external'
          ? {
              componentId: null,
              mappingState: 'external',
              confidence: 1,
              reason: `${importInfo.importLiteral} is outside the repository component graph.`,
            }
          : mapPathToComponent(targetRepoPath, components);
      const mappingConfidence = Math.min(sourceMapping.confidence, targetMapping.confidence);
      const observationSeed = [
        scanId,
        sourceRepoPath,
        importInfo.position,
        importInfo.importLiteral,
        targetRepoPath || 'external',
      ].join('|');

      observations.push({
        observationId: `obs-${sha256HexUtf8(observationSeed).slice(0, 24)}`,
        scanId,
        designId,
        sourcePath: sourceRepoPath,
        targetPath: targetRepoPath,
        importLiteral: importInfo.importLiteral,
        workspaceName: '',
        packageName: '',
        sourceContentSha256: sha256HexUtf8(sourceText),
        isTest: isTestPath(sourceRepoPath),
        sourceComponentId: sourceMapping.componentId,
        targetComponentId: targetMapping.componentId,
        sourceMappingState: sourceMapping.mappingState,
        targetMappingState: targetMapping.mappingState,
        mappingConfidence,
        mappingReason: `${sourceMapping.reason} ${targetMapping.reason}`,
        relationType: 'depends_on',
        metadata: { position: importInfo.position },
      });
    }
  }

  return {
    scan: {
      scanId,
      designId,
      scannerVersion: 'component-architecture-fitness-v1',
      scanState: 'evaluated',
    },
    observations,
    evaluations: buildEvaluations({ scanId, designId, observations, relations }),
  };
}

module.exports = {
  classifyObservation,
  runArchitectureFitnessScan,
};
