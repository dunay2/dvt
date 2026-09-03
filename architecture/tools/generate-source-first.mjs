import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const architectureDir = dirname(scriptDir);
const config = JSON.parse(readFileSync(join(architectureDir, 'source-first.config.json'), 'utf8'));
const generatedDir = join(architectureDir, 'generated');
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
writeFileSync(join(generatedDir, 'summary.json'), JSON.stringify({
  schemaVersion: 3,
  repository: config.repository,
  baselineRef: config.baselineRef,
  baselineSha,
  contexts: contexts.map((ctx) => ({
    id: ctx.id,
    packageName: ctx.packageName,
    path: ctx.path,
    packageConcern: ctx.packageConcern,
    counts: ctx.counts,
    modules: ctx.modules.map((m) => ({
      id: m.id,
      title: m.title,
      kind: m.kind,
      fileCount: m.files.length,
      ownedConcerns: m.ownedConcerns,
    })),
  })),
}, null, 2) + '\n');
writeFileSync(join(generatedDir, 'source-first.c4'), render(contexts));

console.log(`Generated source-first architecture v3 at ${baselineSha}`);
for (const ctx of contexts) {
  console.log(`${ctx.packageName}: ${ctx.counts.trackedFiles} tracked, ${ctx.counts.sourceFiles} src, ${ctx.counts.testFiles} tests, ${ctx.modules.length} modules`);
}

function loadContext(def) {
  const files = git(['ls-tree', '-r', '-l', baselineSha, '--', def.path])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseTreeLine(line, def.path))
    .filter(Boolean)
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (!files.length) throw new Error(`No tracked files under ${def.path}@${baselineSha}`);

  const packageFile = files.find((f) => f.relativePath === 'package.json');
  if (!packageFile) throw new Error(`Missing package.json in ${def.path}`);
  const packageJson = JSON.parse(git(['show', `${baselineSha}:${packageFile.path}`]));
  const packageName = packageJson.name ?? def.path;

  const sourceFiles = files
    .filter((f) => f.relativePath.startsWith('src/') && /\.(?:[cm]?js|jsx|ts|tsx)$/.test(f.relativePath))
    .map((file) => {
      const content = git(['show', `${baselineSha}:${file.path}`]);
      return { ...file, content, metadata: parseMetadata(content), imports: parseImports(content) };
    });
  const sourceByPath = new Map(sourceFiles.map((f) => [f.relativePath, f]));

  const groups = new Map();
  for (const file of sourceFiles) {
    const key = moduleKey(file.relativePath);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(file);
  }
  const modules = [...groups.entries()]
    .map(([key, moduleFiles]) => buildModule(key, moduleFiles, def.path))
    .sort((a, b) => a.title.localeCompare(b.title));
  const moduleByKey = new Map(modules.map((m) => [m.key, m]));

  const internal = new Map();
  for (const source of sourceFiles) {
    const from = moduleByKey.get(moduleKey(source.relativePath));
    for (const specifier of source.imports) {
      if (!specifier.startsWith('.')) continue;
      const targetFile = resolveRelativeImport(source.relativePath, specifier, sourceByPath);
      if (!targetFile) continue;
      const to = moduleByKey.get(moduleKey(targetFile.relativePath));
      if (!to || from.id === to.id) continue;
      const key = `${from.id}->${to.id}`;
      internal.set(key, { from: from.id, to: to.id, count: (internal.get(key)?.count ?? 0) + 1 });
    }
  }

  const index = sourceFiles.find((f) => f.relativePath === 'src/index.ts');
  const packageConcern = index?.metadata.ownedConcern ?? index?.metadata.headerSummary ?? `Source-first bounded context observed at ${def.path}.`;
  const counts = {
    trackedFiles: files.length,
    sourceFiles: files.filter((f) => f.relativePath.startsWith('src/')).length,
    testFiles: files.filter((f) => /^tests?\//.test(f.relativePath)).length,
    docsFiles: files.filter((f) => f.relativePath.startsWith('docs/')).length,
    packageRootFiles: files.filter((f) => !f.relativePath.includes('/')).length,
    filesWithOwnedConcern: sourceFiles.filter((f) => Boolean(f.metadata.ownedConcern)).length,
    filesWithDecision: sourceFiles.filter((f) => Boolean(f.metadata.decision)).length,
  };

  return {
    id: def.id,
    path: def.path,
    packageName,
    packageConcern,
    files,
    sourceFiles,
    modules,
    internalEdges: [...internal.values()],
    workspaceEdges: [],
    counts,
  };
}

function deriveWorkspaceEdges(ctx, packageByName) {
  const counts = new Map();
  for (const file of ctx.sourceFiles) {
    for (const specifier of file.imports) {
      for (const [name, target] of packageByName) {
        if (target.id === ctx.id) continue;
        if (specifier === name || specifier.startsWith(`${name}/`)) {
          counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
        }
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
      if (/\*\//.test(raw)) break;
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
  return line
    .replace(/^\s*\/\*\*?\s?/, '')
    .replace(/^\s*\*\s?/, '')
    .replace(/\*\/\s*$/, '')
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

function moduleKey(relativePath) {
  const rest = relativePath.replace(/^src\//, '');
  return rest.includes('/') ? rest.split('/')[0] : 'srcRoot';
}

function buildModule(key, files, scope) {
  const sourcePath = key === 'srcRoot' ? posix.join(scope, 'src') : posix.join(scope, 'src', key);
  return {
    key,
    id: `mod_${safeId(key)}`,
    title: key === 'srcRoot' ? 'Public / source root' : humanize(key),
    kind: kindFor(key),
    sourcePath,
    sourceUrl: `https://github.com/${config.repository}/tree/${baselineSha}/${encodePath(sourcePath)}`,
    files: [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    ownedConcerns: [...new Set(files.map((f) => f.metadata.ownedConcern).filter(Boolean))],
    decisions: [...new Set(files.map((f) => f.metadata.decision).filter(Boolean))],
  };
}

function kindFor(key) {
  const value = key.toLowerCase();
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
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function resolveRelativeImport(sourcePath, specifier, sourceByPath) {
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
  for (const candidate of candidates) if (sourceByPath.has(candidate)) return sourceByPath.get(candidate);
  return undefined;
}

function inventoryPayload(ctx) {
  return {
    schemaVersion: 3,
    generatedFrom: 'git-tree',
    repository: config.repository,
    baselineRef: config.baselineRef,
    baselineSha,
    packageName: ctx.packageName,
    scope: ctx.path,
    packageConcern: ctx.packageConcern,
    counts: ctx.counts,
    modules: ctx.modules.map((m) => ({
      id: m.id,
      key: m.key,
      title: m.title,
      kind: m.kind,
      provenance: 'STRUCTURE-DERIVED',
      sourcePath: m.sourcePath,
      fileCount: m.files.length,
      ownedConcerns: m.ownedConcerns,
      decisions: m.decisions,
      files: m.files.map((f) => f.relativePath),
    })),
    internalModuleDependencies: ctx.internalEdges,
    selectedWorkspaceDependencies: ctx.workspaceEdges,
    files: ctx.files,
  };
}

function render(all) {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Source baseline: ${config.repository}@${baselineSha}`,
    'model {',
    "  dvt = system 'DVT+ — source-first architecture' {",
    '    #asIs',
    "    description 'Generated from the current Git tree. Package/module structure and dependency arrows are source-derived; target architecture is never promoted automatically.'",
    '    metadata {',
    `      repository '${esc(config.repository)}'`,
    `      baselineSha '${baselineSha}'`,
    `      selectedContexts '${all.length}'`,
    '    }',
  ];

  for (const ctx of all) emitContext(ctx, lines);
  lines.push('  }');

  const evidenceRefs = new Map();
  for (const ctx of all) {
    const inventoryId = `inventory_${safeId(ctx.id)}`;
    const refs = new Map();
    evidenceRefs.set(ctx.id, refs);
    lines.push(`  ${inventoryId} = inventory '${esc(ctx.packageName)} — exact Git evidence' {`);
    lines.push('    #sourceDerived');
    lines.push(`    description '${esc(`${ctx.counts.trackedFiles} tracked files from ${ctx.path}@${baselineSha.slice(0, 8)}.`)}'`);
    lines.push('    metadata {');
    lines.push("      provenance 'SOURCE-DERIVED'");
    lines.push(`      baselineSha '${baselineSha}'`);
    lines.push(`      sourceRoot '${esc(ctx.path)}'`);
    lines.push(`      trackedFiles '${ctx.counts.trackedFiles}'`);
    lines.push('    }');
    lines.push(`    link https://github.com/${config.repository}/tree/${baselineSha}/${encodePath(ctx.path)} 'Pinned package tree'`);
    for (const file of ctx.files) {
      const id = `file_${safeId(ctx.id)}_${safeId(file.relativePath)}_${file.blobSha.slice(0, 7)}`;
      refs.set(file.relativePath, `${inventoryId}.${id}`);
      lines.push(`    ${id} = file '${esc(file.relativePath)}' {`);
      lines.push('      #sourceDerived');
      lines.push("      description 'Tracked file from the pinned Git tree.'");
      lines.push('      metadata {');
      lines.push("        provenance 'SOURCE-DERIVED'");
      lines.push(`        sourcePath '${esc(file.path)}'`);
      lines.push(`        blobSha '${file.blobSha}'`);
      lines.push(`        baselineSha '${baselineSha}'`);
      lines.push('      }');
      lines.push(`      link ${file.githubUrl} 'Open pinned source'`);
      lines.push('    }');
    }
    lines.push('  }');
  }

  for (const ctx of all) {
    for (const edge of ctx.workspaceEdges) {
      lines.push(`  dvt.pkg_${safeId(edge.from)} .uses dvt.pkg_${safeId(edge.to)} 'workspace imports (${edge.count})'`);
    }
  }

  lines.push('}', '', 'views {');
  lines.push('  view dvtSourceFirst of dvt {');
  lines.push("    title 'DVT+ — Source-first bounded contexts'");
  lines.push(`    description 'Generated from main@${baselineSha.slice(0, 8)}. Package arrows come from source imports.'`);
  lines.push('    include *');
  lines.push('    autoLayout LeftRight');
  lines.push('  }', '');

  for (const ctx of all) {
    lines.push(`  view ${safeId(ctx.id)}Boundary of dvt.pkg_${safeId(ctx.id)} {`);
    lines.push(`    title '${esc(ctx.packageName)} — source modules and dependencies'`);
    lines.push(`    description '${esc(`STRUCTURE-DERIVED modules from ${ctx.path}/src at ${baselineSha.slice(0, 8)}.`)}'`);
    lines.push('    include *');
    lines.push('    autoLayout LeftRight');
    lines.push('  }', '');

    const inventoryId = `inventory_${safeId(ctx.id)}`;
    lines.push(`  view ${safeId(ctx.id)}Inventory of ${inventoryId} {`);
    lines.push(`    title '${esc(ctx.packageName)} — complete Git evidence'`);
    lines.push(`    description '${esc(`${ctx.counts.trackedFiles} tracked files; use focused module views for readable evidence.`)}'`);
    lines.push('    include *');
    lines.push('    autoLayout TopBottom');
    lines.push('  }', '');

    const refs = evidenceRefs.get(ctx.id);
    for (const module of ctx.modules) {
      lines.push(`  view ${safeId(ctx.id)}Files_${safeId(module.key)} {`);
      lines.push(`    title '${esc(ctx.packageName)} — files for ${module.title}'`);
      lines.push(`    description '${esc(`SOURCE-DERIVED evidence for ${module.sourcePath}. ${module.files.length} source file(s).`)}'`);
      for (const file of module.files) lines.push(`    include ${refs.get(file.relativePath)}`);
      lines.push('    autoLayout TopBottom');
      lines.push('  }', '');
    }

    for (const [suffix, predicate, title] of [
      ['Tests', (path) => /^tests?\//.test(path), 'tests'],
      ['Docs', (path) => path.startsWith('docs/'), 'docs'],
      ['Root', (path) => !path.includes('/'), 'package root files'],
    ]) {
      const selected = ctx.files.filter((file) => predicate(file.relativePath));
      if (!selected.length) continue;
      lines.push(`  view ${safeId(ctx.id)}${suffix} {`);
      lines.push(`    title '${esc(ctx.packageName)} — ${title}'`);
      lines.push(`    description '${selected.length} SOURCE-DERIVED file(s).'`);
      for (const file of selected) lines.push(`    include ${refs.get(file.relativePath)}`);
      lines.push('    autoLayout TopBottom');
      lines.push('  }', '');
    }
  }

  lines.push('}', '');
  return lines.join('\n');
}

function emitContext(ctx, lines) {
  lines.push(`    pkg_${safeId(ctx.id)} = package '${esc(ctx.packageName)}' {`);
  lines.push('      #asIs');
  lines.push(`      description '${esc(ctx.packageConcern)}'`);
  lines.push('      metadata {');
  lines.push("        provenance 'SOURCE-FIRST'");
  lines.push(`        sourceRoot '${esc(ctx.path)}'`);
  lines.push(`        baselineSha '${baselineSha}'`);
  lines.push(`        trackedFiles '${ctx.counts.trackedFiles}'`);
  lines.push(`        sourceFiles '${ctx.counts.sourceFiles}'`);
  lines.push(`        testFiles '${ctx.counts.testFiles}'`);
  lines.push('      }');
  lines.push(`      link https://github.com/${config.repository}/tree/${baselineSha}/${encodePath(ctx.path)} 'Pinned package tree'`);

  for (const module of ctx.modules) {
    lines.push(`      ${module.id} = ${module.kind} '${esc(module.title)}' {`);
    lines.push('        #structureDerived');
    lines.push(`        description '${esc(module.ownedConcerns.length ? module.ownedConcerns.join(' | ') : `Source grouping observed at ${module.sourcePath}.`)}'`);
    lines.push('        metadata {');
    lines.push("          provenance 'STRUCTURE-DERIVED'");
    lines.push(`          sourcePath '${esc(module.sourcePath)}'`);
    lines.push(`          fileCount '${module.files.length}'`);
    lines.push(`          evidenceView '${safeId(ctx.id)}Files_${safeId(module.key)}'`);
    if (module.ownedConcerns.length) lines.push(`          ownedConcernCount '${module.ownedConcerns.length}'`);
    if (module.decisions.length) lines.push(`          decisionCount '${module.decisions.length}'`);
    lines.push('        }');
    lines.push(`        link ${module.sourceUrl} 'Pinned source module'`);
    lines.push('      }');
  }

  for (const edge of ctx.internalEdges) {
    lines.push(`      ${edge.from} .uses ${edge.to} 'source imports (${edge.count})'`);
  }
  lines.push('    }');
}

function safeId(value) {
  let result = String(value)
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!result) result = 'root';
  if (!/^[A-Za-z_]/.test(result)) result = `_${result}`;
  return result;
}

function encodePath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function esc(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ');
}
