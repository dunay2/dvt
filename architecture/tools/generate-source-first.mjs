import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_EXT_RE = /\.(?:[cm]?[jt]sx?)$/i;
const TEST_FILE_RE = /\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const TEST_DIR_RE = /(?:^|\/)(?:test|tests|__tests__|cypress)(?:\/|$)/i;
const TEST_SUPPORT_RE = /(?:^|\/)(?:testing|test-support|fixtures|__fixtures__)(?:\/|$)|\.test\.support\.[cm]?[jt]sx?$/i;
const ALLOWED_CONTEXT_KINDS = new Set(['package', 'app', 'worker', 'adapter', 'plugin']);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const architectureDir = dirname(scriptDir);
const config = JSON.parse(readFileSync(join(architectureDir, 'source-first.config.json'), 'utf8'));
const generatedDir = join(architectureDir, 'generated');
const grouping = {
  maxFiles: Number(config.moduleGrouping?.maxFiles ?? 80),
  maxDepth: Number(config.moduleGrouping?.maxDepth ?? 3),
};
if (!Number.isInteger(grouping.maxFiles) || grouping.maxFiles < 1) throw new Error('moduleGrouping.maxFiles must be a positive integer');
if (!Number.isInteger(grouping.maxDepth) || grouping.maxDepth < 1) throw new Error('moduleGrouping.maxDepth must be a positive integer');

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }).trimEnd();
const baselineSha = git(['rev-parse', config.baselineRef]);
git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const contexts = config.contexts.map(loadContext);
const packageByName = new Map(contexts.map((ctx) => [ctx.packageName, ctx]));
for (const ctx of contexts) deriveWorkspaceEdges(ctx, packageByName);

mkdirSync(generatedDir, { recursive: true });
for (const ctx of contexts) {
  writeFileSync(join(generatedDir, `${ctx.id}-inventory.json`), JSON.stringify(inventoryPayload(ctx), null, 2) + '\n');
}
writeFileSync(
  join(generatedDir, 'summary.json'),
  JSON.stringify(
    {
      schemaVersion: 6,
      repository: config.repository,
      baselineRef: config.baselineRef,
      baselineSha,
      moduleGrouping: grouping,
      groups: groupContexts(contexts).map(([name, members]) => ({ name, contextIds: members.map((ctx) => ctx.id) })),
      contexts: contexts.map((ctx) => ({
        id: ctx.id,
        kind: ctx.kind,
        group: ctx.group,
        packageName: ctx.packageName,
        path: ctx.path,
        packageConcern: ctx.packageConcern,
        packageConcernSource: ctx.packageConcernSource,
        counts: ctx.counts,
        modules: ctx.modules.map((module) => ({
          id: module.id,
          key: module.key,
          title: module.title,
          kind: module.kind,
          depth: module.depth,
          implementationFileCount: module.files.length,
          ownedConcerns: module.ownedConcerns,
        })),
      })),
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(join(generatedDir, 'source-first.c4'), render(contexts));

console.log(`Generated source-first architecture v6 at ${baselineSha}`);
for (const ctx of contexts) {
  console.log(
    `${ctx.packageName}: ${ctx.counts.trackedFiles} tracked, ${ctx.counts.implementationFiles} implementation, ${ctx.counts.testFiles} tests, ${ctx.counts.testSupportFiles} test-support, ${ctx.modules.length} modules`,
  );
}

function loadContext(def) {
  const kind = def.kind ?? 'package';
  if (!ALLOWED_CONTEXT_KINDS.has(kind)) throw new Error(`Unsupported context kind ${kind} for ${def.id}`);

  const files = git(['ls-tree', '-r', '-l', baselineSha, '--', def.path])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseTreeLine(line, def.path))
    .filter(Boolean)
    .map((file) => ({ ...file, classification: classifyTrackedFile(file.relativePath) }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (!files.length) throw new Error(`No tracked files under ${def.path}@${baselineSha}`);

  const packageFile = files.find((file) => file.relativePath === 'package.json');
  if (!packageFile) throw new Error(`Missing package.json in ${def.path}`);
  const packageJson = JSON.parse(git(['show', `${baselineSha}:${packageFile.path}`]));
  const packageName = packageJson.name ?? def.path;

  const implementationFiles = files
    .filter((file) => file.classification === 'implementation-source')
    .map((file) => {
      const content = git(['show', `${baselineSha}:${file.path}`]);
      return { ...file, content, metadata: parseMetadata(content), imports: parseImports(content) };
    });
  const implementationByPath = new Map(implementationFiles.map((file) => [file.relativePath, file]));

  const partition = buildAdaptiveModules(implementationFiles, def.path);
  const modules = partition.modules;
  const moduleByKey = new Map(modules.map((module) => [module.key, module]));

  const internal = new Map();
  for (const source of implementationFiles) {
    const fromKey = partition.moduleKeyByFile.get(source.relativePath);
    const from = moduleByKey.get(fromKey);
    if (!from) throw new Error(`No source module for ${def.id}:${source.relativePath}`);
    for (const specifier of source.imports) {
      if (!specifier.startsWith('.')) continue;
      const targetFile = resolveRelativeImport(source.relativePath, specifier, implementationByPath);
      if (!targetFile) continue;
      const toKey = partition.moduleKeyByFile.get(targetFile.relativePath);
      const to = moduleByKey.get(toKey);
      if (!to) throw new Error(`No target module for ${def.id}:${targetFile.relativePath}`);
      if (from.id === to.id) continue;
      const key = `${from.id}->${to.id}`;
      internal.set(key, { from: from.id, to: to.id, count: (internal.get(key)?.count ?? 0) + 1 });
    }
  }

  const index = implementationFiles.find((file) => file.relativePath === 'src/index.ts');
  const concern = resolvePackageConcern(index, packageJson, def.path);
  const counts = {
    trackedFiles: files.length,
    sourceTrackedFiles: files.filter((file) => file.relativePath.startsWith('src/') && SOURCE_EXT_RE.test(file.relativePath)).length,
    implementationFiles: implementationFiles.length,
    testFiles: files.filter((file) => file.classification === 'test').length,
    testSupportFiles: files.filter((file) => file.classification === 'test-support').length,
    docsFiles: files.filter((file) => file.classification === 'docs').length,
    packageRootFiles: files.filter((file) => file.classification === 'package-root').length,
    filesWithOwnedConcern: implementationFiles.filter((file) => Boolean(file.metadata.ownedConcern)).length,
    filesWithDecision: implementationFiles.filter((file) => Boolean(file.metadata.decision)).length,
    visualizedEvidenceFiles: implementationFiles.length,
  };

  assertModuleCoverage(def.id, implementationFiles, modules, partition.moduleKeyByFile);

  return {
    id: def.id,
    kind,
    group: def.group ?? 'Ungrouped',
    path: def.path,
    packageName,
    packageConcern: concern.text,
    packageConcernSource: concern.source,
    files,
    implementationFiles,
    modules,
    internalEdges: [...internal.values()],
    workspaceEdges: [],
    counts,
  };
}

function buildAdaptiveModules(files, scope) {
  const modules = [];
  const moduleKeyByFile = new Map();
  const rootFiles = files.filter((file) => srcSegments(file).length === 1);
  if (rootFiles.length) addModule('srcRoot', [], rootFiles, scope, modules, moduleKeyByFile);

  const top = new Map();
  for (const file of files) {
    const segments = srcSegments(file);
    if (segments.length < 2) continue;
    const key = segments[0];
    if (!top.has(key)) top.set(key, []);
    top.get(key).push(file);
  }
  for (const [segment, bucket] of [...top.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    splitDirectory([segment], bucket, 1, scope, modules, moduleKeyByFile);
  }

  return { modules: modules.sort((a, b) => a.title.localeCompare(b.title)), moduleKeyByFile };
}

function splitDirectory(prefix, bucket, depth, scope, modules, moduleKeyByFile) {
  const direct = [];
  const childBuckets = new Map();
  for (const file of bucket) {
    const segments = srcSegments(file);
    if (segments.length === prefix.length + 1) {
      direct.push(file);
      continue;
    }
    const child = segments[prefix.length];
    if (!childBuckets.has(child)) childBuckets.set(child, []);
    childBuckets.get(child).push(file);
  }

  const canSplit = bucket.length > grouping.maxFiles && depth < grouping.maxDepth && childBuckets.size > 0;
  if (!canSplit) {
    addModule(prefix.join('/'), prefix, bucket, scope, modules, moduleKeyByFile);
    return;
  }

  if (direct.length) addModule(`${prefix.join('/')}/@root`, prefix, direct, scope, modules, moduleKeyByFile, true);
  for (const [child, files] of [...childBuckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    splitDirectory([...prefix, child], files, depth + 1, scope, modules, moduleKeyByFile);
  }
}

function addModule(key, directorySegments, files, scope, modules, moduleKeyByFile, rootSlice = false) {
  if (!files.length) return;
  const sourcePath = directorySegments.length ? posix.join(scope, 'src', ...directorySegments) : posix.join(scope, 'src');
  const depth = directorySegments.length;
  const module = {
    key,
    id: `mod_${safeId(key)}`,
    title: moduleTitle(key, directorySegments, rootSlice),
    kind: kindFor(key),
    depth,
    sourcePath,
    sourceUrl: `https://github.com/${config.repository}/tree/${baselineSha}/${encodePath(sourcePath)}`,
    files: [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    ownedConcerns: [...new Set(files.map((file) => file.metadata.ownedConcern).filter(Boolean))],
    decisions: [...new Set(files.map((file) => file.metadata.decision).filter(Boolean))],
  };
  modules.push(module);
  for (const file of files) {
    if (moduleKeyByFile.has(file.relativePath)) throw new Error(`Implementation file assigned twice: ${file.relativePath}`);
    moduleKeyByFile.set(file.relativePath, key);
  }
}

function moduleTitle(key, directorySegments, rootSlice) {
  if (key === 'srcRoot') return 'Public / source root';
  const title = directorySegments.map(humanize).join(' / ');
  return rootSlice ? `${title} / Root files` : title;
}

function srcSegments(file) {
  return file.relativePath.replace(/^src\//, '').split('/');
}

function assertModuleCoverage(contextId, implementationFiles, modules, moduleKeyByFile) {
  const assigned = modules.reduce((sum, module) => sum + module.files.length, 0);
  if (assigned !== implementationFiles.length) {
    throw new Error(`${contextId}: module coverage ${assigned} != implementation files ${implementationFiles.length}`);
  }
  if (moduleKeyByFile.size !== implementationFiles.length) {
    throw new Error(`${contextId}: module key map ${moduleKeyByFile.size} != implementation files ${implementationFiles.length}`);
  }
  for (const file of implementationFiles) {
    if (file.classification !== 'implementation-source') throw new Error(`${contextId}: non-implementation file entered topology: ${file.relativePath}`);
    if (!moduleKeyByFile.has(file.relativePath)) throw new Error(`${contextId}: unassigned implementation file: ${file.relativePath}`);
  }
}

function classifyTrackedFile(relativePath) {
  if (isTestSupportFile(relativePath)) return 'test-support';
  if (isTestFile(relativePath)) return 'test';
  if (relativePath.startsWith('docs/') || /(?:^|\/)README\.md$/i.test(relativePath)) return 'docs';
  if (relativePath.startsWith('src/') && SOURCE_EXT_RE.test(relativePath)) return 'implementation-source';
  if (!relativePath.includes('/')) return 'package-root';
  return 'other';
}

function isTestFile(relativePath) {
  return TEST_FILE_RE.test(relativePath) || TEST_DIR_RE.test(relativePath);
}

function isTestSupportFile(relativePath) {
  return TEST_SUPPORT_RE.test(relativePath);
}

function resolvePackageConcern(index, packageJson, path) {
  if (index?.metadata.ownedConcern) return { text: index.metadata.ownedConcern, source: 'OWNED_CONCERN' };
  if (packageJson.description) return { text: normalizeProse(packageJson.description), source: 'PACKAGE_JSON_DESCRIPTION' };
  if (index?.metadata.headerSummary) return { text: index.metadata.headerSummary, source: 'SOURCE_HEADER' };
  return {
    text: `No package-level concern marker found in src/index.ts for ${path}; inspect implementation modules and source evidence.`,
    source: 'NO_PACKAGE_CONCERN_MARKER',
  };
}

function deriveWorkspaceEdges(ctx, packageByName) {
  const counts = new Map();
  for (const file of ctx.implementationFiles) {
    for (const specifier of file.imports) {
      for (const [name, target] of packageByName) {
        if (target.id === ctx.id) continue;
        if (specifier === name || specifier.startsWith(`${name}/`)) counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
      }
    }
  }
  ctx.workspaceEdges = [...counts]
    .map(([to, count]) => ({ from: ctx.id, to, count }))
    .sort((a, b) => a.to.localeCompare(b.to));
}

function parseTreeLine(line, scope) {
  const match = line.match(/^(\d+)\s+(\w+)\s+([0-9a-f]+)\s+(-|\d+)\t(.+)$/);
  if (!match) throw new Error(`Cannot parse git ls-tree line: ${line}`);
  const [, mode, type, blobSha, rawSize, path] = match;
  if (type !== 'blob') return null;
  const relativePath = path.startsWith(`${scope}/`) ? path.slice(scope.length + 1) : path;
  return {
    mode,
    type,
    blobSha,
    sizeBytes: rawSize === '-' ? null : Number(rawSize),
    path,
    relativePath,
    githubUrl: `https://github.com/${config.repository}/blob/${baselineSha}/${encodePath(path)}`,
  };
}

function parseMetadata(content) {
  return {
    ownedConcern: extractCommentField(content, ['@ownedConcern', 'Owned concern:']),
    decision: extractCommentField(content, ['@decision']),
    consequence: extractCommentField(content, ['@consequence']),
    headerSummary: headerSummary(content),
  };
}

function extractCommentField(content, markers) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < Math.min(lines.length, 120); index += 1) {
    const clean = cleanCommentLine(lines[index]);
    const marker = markers.find((candidate) => clean.toLowerCase().startsWith(candidate.toLowerCase()));
    if (!marker) continue;

    const values = [];
    const firstValue = clean.slice(marker.length).trim();
    if (firstValue) values.push(firstValue);

    for (let cursor = index + 1; cursor < Math.min(lines.length, index + 12); cursor += 1) {
      const raw = lines[cursor];
      if (/^\s*\*\/\s*$/.test(raw)) break;
      const next = cleanCommentLine(raw);
      if (!next) break;
      if (next.startsWith('@') || /^Owned\s+concern:/i.test(next)) break;
      if (!isCommentContinuation(raw)) break;
      values.push(next);
    }

    const normalized = normalizeProse(values.join(' '));
    if (normalized) return normalized;
  }
  return undefined;
}

function isCommentContinuation(line) {
  return /^\s*(?:\/\/|\*)/.test(line);
}

function cleanCommentLine(line) {
  if (/^\s*\/\*\*?\s*$/.test(line) || /^\s*\*\/\s*$/.test(line)) return '';
  return line
    .replace(/^\s*\/\*\*?\s?/, '')
    .replace(/\*\/\s*$/, '')
    .replace(/^\s*\*\s?/, '')
    .replace(/^\s*\/\/\s?/, '')
    .trim();
}

function normalizeProse(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function headerSummary(content) {
  const result = [];
  for (const line of content.split(/\r?\n/).slice(0, 50)) {
    if (/^\s*(?:export|import|const|let|class|interface|type|function)\b/.test(line)) break;
    const text = cleanCommentLine(line);
    if (!text) {
      if (result.length) break;
      continue;
    }
    if (!/[A-Za-z0-9]/.test(text)) continue;
    if (isDecorativeHeader(text) || text.startsWith('@') || /^Governing:/i.test(text) || /^Owned\s+concern:/i.test(text)) continue;
    result.push(text);
    const prose = normalizeProse(result.join(' '));
    if (/[.!?]$/.test(prose)) return prose;
    if (result.length >= 3) return prose;
  }
  return result.length ? normalizeProse(result.join(' ')) : undefined;
}

function isDecorativeHeader(text) {
  if (/^[\-─—=_*\s]+$/.test(text)) return true;
  if (/^[─—=_-]{2,}.*[─—=_-]{2,}$/.test(text)) return true;
  const framing = (text.match(/[─—=_-]/g) ?? []).length;
  return framing >= 8 && framing / Math.max(text.length, 1) > 0.25;
}

function parseImports(content) {
  const values = new Set();
  for (const match of content.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g)) values.add(match[1]);
  for (const match of content.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) values.add(match[1]);
  return [...values];
}

function kindFor(key) {
  const segments = key.split('/').filter((segment) => segment && segment !== '@root' && segment !== 'srcRoot');
  const value = (segments.at(-1) ?? key).toLowerCase();
  if (value === 'ports' || value.endsWith('ports')) return 'port';
  if (value.includes('adapter')) return 'adapter';
  if (value.includes('worker')) return 'worker';
  if (value.endsWith('store') || value === 'stores') return 'store';
  return 'component';
}

function humanize(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function resolveRelativeImport(sourcePath, specifier, implementationByPath) {
  const raw = posix.normalize(posix.join(posix.dirname(sourcePath), specifier.split('?')[0].split('#')[0]));
  const noJs = raw.replace(/\.(?:mjs|cjs|js|jsx)$/, '');
  const candidates = [
    raw,
    `${noJs}.ts`,
    `${noJs}.tsx`,
    `${noJs}.js`,
    `${noJs}.mjs`,
    `${noJs}/index.ts`,
    `${noJs}/index.tsx`,
    `${raw}/index.ts`,
  ];
  for (const candidate of candidates) if (implementationByPath.has(candidate)) return implementationByPath.get(candidate);
  return undefined;
}

function inventoryPayload(ctx) {
  return {
    schemaVersion: 6,
    generatedFrom: 'git-tree',
    repository: config.repository,
    baselineRef: config.baselineRef,
    baselineSha,
    moduleGrouping: grouping,
    kind: ctx.kind,
    group: ctx.group,
    packageName: ctx.packageName,
    scope: ctx.path,
    packageConcern: ctx.packageConcern,
    packageConcernSource: ctx.packageConcernSource,
    counts: ctx.counts,
    modules: ctx.modules.map((module) => ({
      id: module.id,
      key: module.key,
      title: module.title,
      kind: module.kind,
      depth: module.depth,
      provenance: 'STRUCTURE-DERIVED',
      sourcePath: module.sourcePath,
      implementationFileCount: module.files.length,
      ownedConcerns: module.ownedConcerns,
      decisions: module.decisions,
      files: module.files.map((file) => file.relativePath),
    })),
    internalModuleDependencies: ctx.internalEdges,
    selectedWorkspaceDependencies: ctx.workspaceEdges,
    files: ctx.files,
  };
}

function groupContexts(all) {
  const grouped = new Map();
  for (const ctx of all) {
    if (!grouped.has(ctx.group)) grouped.set(ctx.group, []);
    grouped.get(ctx.group).push(ctx);
  }
  return [...grouped.entries()];
}

function render(all) {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Source baseline: ${config.repository}@${baselineSha}`,
    'model {',
    "  dvt = system 'DVT+ — source-first architecture' {",
    '    #asIs',
    "    description 'Generated from the current Git tree. Runtime dependency arrows use implementation imports only; target architecture is never promoted automatically.'",
    '    metadata {',
    `      repository '${esc(config.repository)}'`,
    `      baselineSha '${baselineSha}'`,
    `      selectedContexts '${all.length}'`,
    `      moduleMaxFiles '${grouping.maxFiles}'`,
    `      moduleMaxDepth '${grouping.maxDepth}'`,
    '    }',
  ];

  for (const ctx of all) emitContext(ctx, lines);
  lines.push('  }');

  const evidenceRefs = new Map();
  for (const ctx of all) {
    const inventoryId = `inventory_${safeId(ctx.id)}`;
    const refs = new Map();
    evidenceRefs.set(ctx.id, refs);
    lines.push(`  ${inventoryId} = inventory '${esc(ctx.packageName)} — implementation evidence' {`);
    lines.push('    #sourceDerived');
    lines.push(
      `    description '${esc(`${ctx.counts.implementationFiles} implementation files from ${ctx.path}@${baselineSha.slice(0, 8)}. Full ${ctx.counts.trackedFiles}-file Git inventory remains in the generated JSON evidence.`)}'`,
    );
    lines.push('    metadata {');
    lines.push("      provenance 'SOURCE-DERIVED'");
    lines.push(`      baselineSha '${baselineSha}'`);
    lines.push(`      sourceRoot '${esc(ctx.path)}'`);
    lines.push(`      trackedFiles '${ctx.counts.trackedFiles}'`);
    lines.push(`      implementationFiles '${ctx.counts.implementationFiles}'`);
    lines.push(`      testFiles '${ctx.counts.testFiles}'`);
    lines.push(`      testSupportFiles '${ctx.counts.testSupportFiles}'`);
    lines.push('    }');
    lines.push(`    link https://github.com/${config.repository}/tree/${baselineSha}/${encodePath(ctx.path)} 'Pinned context tree'`);

    for (const file of ctx.implementationFiles) {
      const id = `file_${safeId(ctx.id)}_${safeId(file.relativePath)}_${file.blobSha.slice(0, 7)}`;
      refs.set(file.relativePath, `${inventoryId}.${id}`);
      lines.push(`    ${id} = file '${esc(file.relativePath)}' {`);
      lines.push('      #sourceDerived');
      lines.push("      description 'Implementation source from the pinned Git tree.'");
      lines.push('      metadata {');
      lines.push("        provenance 'SOURCE-DERIVED'");
      lines.push(`        sourcePath '${esc(file.path)}'`);
      lines.push(`        blobSha '${file.blobSha}'`);
      lines.push(`        baselineSha '${baselineSha}'`);
      lines.push('      }');
      lines.push(`      link ${file.githubUrl} 'Open pinned implementation source'`);
      lines.push('    }');
    }
    lines.push('  }');
  }

  for (const ctx of all) {
    for (const edge of ctx.workspaceEdges) {
      lines.push(`  dvt.ctx_${safeId(edge.from)} .uses dvt.ctx_${safeId(edge.to)} 'implementation imports (${edge.count})'`);
    }
  }

  lines.push('}', '', 'views {');
  lines.push('  view dvtSourceFirst of dvt {');
  lines.push("    title 'DVT+ — Source-first bounded contexts'");
  lines.push(`    description 'Generated from main@${baselineSha.slice(0, 8)}. Dependency arrows exclude tests and test-support code.'`);
  lines.push('    include *');
  lines.push('    autoLayout LeftRight');
  lines.push('  }', '');

  for (const [groupName, members] of groupContexts(all)) {
    lines.push(`  view group_${safeId(groupName)} {`);
    lines.push(`    title 'DVT+ — ${esc(groupName)}'`);
    lines.push(`    description '${esc(`Focused source-first view of ${members.length} current context(s) at main@${baselineSha.slice(0, 8)}.`)}'`);
    for (const ctx of members) lines.push(`    include dvt.ctx_${safeId(ctx.id)}`);
    lines.push('    autoLayout LeftRight');
    lines.push('  }', '');
  }

  for (const ctx of all) {
    lines.push(`  view ${safeId(ctx.id)}Boundary of dvt.ctx_${safeId(ctx.id)} {`);
    lines.push(`    title '${esc(ctx.packageName)} — implementation modules and dependencies'`);
    lines.push(
      `    description '${esc(`Adaptive STRUCTURE-DERIVED modules from implementation source at ${ctx.path}/src, pinned to ${baselineSha.slice(0, 8)}. Groups larger than ${grouping.maxFiles} files split recursively to depth ${grouping.maxDepth}; test-only imports are excluded.`)}'`,
    );
    lines.push('    include *');
    lines.push('    autoLayout LeftRight');
    lines.push('  }', '');

    const inventoryId = `inventory_${safeId(ctx.id)}`;
    lines.push(`  view ${safeId(ctx.id)}ImplementationEvidence of ${inventoryId} {`);
    lines.push(`    title '${esc(ctx.packageName)} — implementation evidence'`);
    lines.push(
      `    description '${esc(`${ctx.counts.implementationFiles} source file(s) visualized; ${ctx.counts.testFiles} test and ${ctx.counts.testSupportFiles} test-support file(s) remain machine-readable in JSON evidence.`)}'`,
    );
    lines.push('    include *');
    lines.push('    autoLayout TopBottom');
    lines.push('  }', '');

    const refs = evidenceRefs.get(ctx.id);
    for (const module of ctx.modules) {
      lines.push(`  view ${safeId(ctx.id)}Files_${safeId(module.key)} {`);
      lines.push(`    title '${esc(ctx.packageName)} — implementation files for ${module.title}'`);
      lines.push(`    description '${esc(`SOURCE-DERIVED evidence for ${module.sourcePath}. ${module.files.length} implementation file(s).`)}'`);
      for (const file of module.files) lines.push(`    include ${refs.get(file.relativePath)}`);
      lines.push('    autoLayout TopBottom');
      lines.push('  }', '');
    }
  }

  lines.push('}', '');
  return lines.join('\n');
}

function emitContext(ctx, lines) {
  lines.push(`    ctx_${safeId(ctx.id)} = ${ctx.kind} '${esc(ctx.packageName)}' {`);
  lines.push('      #asIs');
  lines.push(`      description '${esc(ctx.packageConcern)}'`);
  lines.push('      metadata {');
  lines.push("        provenance 'SOURCE-FIRST'");
  lines.push(`        architectureGroup '${esc(ctx.group)}'`);
  lines.push(`        contextKind '${ctx.kind}'`);
  lines.push(`        packageConcernSource '${ctx.packageConcernSource}'`);
  lines.push(`        sourceRoot '${esc(ctx.path)}'`);
  lines.push(`        baselineSha '${baselineSha}'`);
  lines.push(`        trackedFiles '${ctx.counts.trackedFiles}'`);
  lines.push(`        implementationFiles '${ctx.counts.implementationFiles}'`);
  lines.push(`        testFiles '${ctx.counts.testFiles}'`);
  lines.push(`        testSupportFiles '${ctx.counts.testSupportFiles}'`);
  lines.push(`        sourceModules '${ctx.modules.length}'`);
  lines.push('      }');
  lines.push(`      link https://github.com/${config.repository}/tree/${baselineSha}/${encodePath(ctx.path)} 'Pinned context tree'`);

  for (const module of ctx.modules) {
    lines.push(`      ${module.id} = ${module.kind} '${esc(module.title)}' {`);
    lines.push('        #structureDerived');
    lines.push(
      `        description '${esc(module.ownedConcerns.length ? module.ownedConcerns.join(' | ') : `Implementation grouping observed at ${module.sourcePath}.`)}'`,
    );
    lines.push('        metadata {');
    lines.push("          provenance 'STRUCTURE-DERIVED'");
    lines.push(`          sourcePath '${esc(module.sourcePath)}'`);
    lines.push(`          moduleDepth '${module.depth}'`);
    lines.push(`          implementationFileCount '${module.files.length}'`);
    lines.push(`          evidenceView '${safeId(ctx.id)}Files_${safeId(module.key)}'`);
    if (module.ownedConcerns.length) lines.push(`          ownedConcernCount '${module.ownedConcerns.length}'`);
    if (module.decisions.length) lines.push(`          decisionCount '${module.decisions.length}'`);
    lines.push('        }');
    lines.push(`        link ${module.sourceUrl} 'Pinned implementation module'`);
    lines.push('      }');
  }

  for (const edge of ctx.internalEdges) {
    lines.push(`      ${edge.from} .uses ${edge.to} 'implementation imports (${edge.count})'`);
  }
  lines.push('    }');
}

function safeId(value) {
  let result = String(value).replace(/[^A-Za-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!result) result = 'root';
  if (!/^[A-Za-z_]/.test(result)) result = `_${result}`;
  return result;
}

function encodePath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
