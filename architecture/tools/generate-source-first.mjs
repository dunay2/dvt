import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const architectureDir = dirname(scriptDir);
const config = JSON.parse(readFileSync(join(architectureDir, 'source-first.config.json'), 'utf8'));
const generatedDir = join(architectureDir, 'generated');

const git = (args, input) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    input,
    maxBuffer: 128 * 1024 * 1024,
  }).trimEnd();

const baselineSha = git(['rev-parse', config.baselineRef]);
git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const contexts = config.contexts.map(loadContext);
const packageNameToContext = new Map(contexts.map((ctx) => [ctx.packageName, ctx]));
for (const ctx of contexts) deriveWorkspaceDependencies(ctx, packageNameToContext);

mkdirSync(generatedDir, { recursive: true });
for (const ctx of contexts) {
  writeFileSync(
    join(generatedDir, `${ctx.id}-inventory.json`),
    JSON.stringify(toInventoryPayload(ctx), null, 2) + '\n',
  );
}
writeFileSync(
  join(generatedDir, 'summary.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
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
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(join(generatedDir, 'source-first.c4'), renderLikeC4(contexts));

console.log(`Generated source-first architecture at ${baselineSha}`);
for (const ctx of contexts) {
  console.log(
    `${ctx.packageName}: ${ctx.counts.trackedFiles} tracked, ${ctx.counts.sourceFiles} src, ${ctx.counts.testFiles} tests, ${ctx.modules.length} source modules`,
  );
}

function loadContext(definition) {
  const files = git(['ls-tree', '-r', '-l', baselineSha, '--', definition.path])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseTreeLine(line, definition.path))
    .filter(Boolean)
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  if (!files.length) throw new Error(`No tracked files under ${definition.path}@${baselineSha}`);

  const packageJsonFile = files.find((file) => file.relativePath === 'package.json');
  if (!packageJsonFile) throw new Error(`Missing package.json in ${definition.path}`);
  const packageJson = JSON.parse(git(['show', `${baselineSha}:${packageJsonFile.path}`]));
  const packageName = packageJson.name ?? definition.path;

  const sourceFiles = files
    .filter((file) => file.relativePath.startsWith('src/') && isTextSource(file.relativePath))
    .map((file) => {
      const content = git(['show', `${baselineSha}:${file.path}`]);
      return {
        ...file,
        content,
        metadata: parseSourceMetadata(content),
        importSpecifiers: parseImportSpecifiers(content),
      };
    });

  const fileByRelativePath = new Map(sourceFiles.map((file) => [file.relativePath, file]));
  const moduleMap = new Map();
  for (const file of sourceFiles) {
    const key = moduleKey(file.relativePath);
    if (!moduleMap.has(key)) moduleMap.set(key, []);
    moduleMap.get(key).push(file);
  }

  const modules = [...moduleMap.entries()]
    .map(([key, moduleFiles]) => buildModule(key, moduleFiles, definition.path))
    .sort((a, b) => a.title.localeCompare(b.title));
  const moduleByKey = new Map(modules.map((module) => [module.key, module]));

  const internalEdges = new Map();
  for (const source of sourceFiles) {
    const sourceModule = moduleByKey.get(moduleKey(source.relativePath));
    for (const specifier of source.importSpecifiers) {
      if (!specifier.startsWith('.')) continue;
      const target = resolveRelativeImport(source.relativePath, specifier, fileByRelativePath);
      if (!target) continue;
      const targetModule = moduleByKey.get(moduleKey(target.relativePath));
      if (!targetModule || sourceModule.id === targetModule.id) continue;
      const key = `${sourceModule.id}->${targetModule.id}`;
      internalEdges.set(key, {
        from: sourceModule.id,
        to: targetModule.id,
        count: (internalEdges.get(key)?.count ?? 0) + 1,
      });
    }
  }

  const rootIndex = sourceFiles.find((file) => file.relativePath === 'src/index.ts');
  const packageConcern =
    rootIndex?.metadata.ownedConcern ??
    rootIndex?.metadata.headerSummary ??
    `Source-first bounded context observed at ${definition.path}.`;

  const root = makeFolder('', '');
  for (const file of files) addInventoryFile(root, file);
  countFolderFiles(root);

  return {
    id: definition.id,
    path: definition.path,
    packageName,
    packageConcern,
    files,
    sourceFiles,
    modules,
    moduleByKey,
    internalEdges: [...internalEdges.values()],
    workspaceEdges: [],
    root,
    counts: {
      trackedFiles: files.length,
      sourceFiles: files.filter((f) => f.relativePath.startsWith('src/')).length,
      testFiles: files.filter((f) => /^tests?\//.test(f.relativePath)).length,
      docsFiles: files.filter((f) => f.relativePath.startsWith('docs/')).length,
      packageRootFiles: files.filter((f) => !f.relativePath.includes('/')).length,
      filesWithOwnedConcern: sourceFiles.filter((f) => Boolean(f.metadata.ownedConcern)).length,
      filesWithDecision: sourceFiles.filter((f) => Boolean(f.metadata.decision)).length,
    },
  };
}

function deriveWorkspaceDependencies(ctx, packageNameToContext) {
  const counts = new Map();
  for (const file of ctx.sourceFiles) {
    for (const specifier of file.importSpecifiers) {
      for (const [packageName, target] of packageNameToContext) {
        if (target.id === ctx.id) continue;
        if (specifier === packageName || specifier.startsWith(`${packageName}/`)) {
          counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
        }
      }
    }
  }
  ctx.workspaceEdges = [...counts.entries()]
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
    githubUrl: `https://github.com/${config.repository}/blob/${baselineSha}/${encodeGitHubPath(path)}`,
  };
}

function isTextSource(path) {
  return /\.(?:[cm]?js|jsx|ts|tsx)$/.test(path);
}

function parseSourceMetadata(content) {
  return {
    ownedConcern: firstMatch(content, [
      /@ownedConcern\s+([^\r\n*]+)/i,
      /Owned concern:\s*([^\r\n*]+)/i,
    ]),
    decision: firstMatch(content, [/@decision\s+([^\r\n*]+)/i]),
    consequence: firstMatch(content, [/@consequence\s+([^\r\n*]+)/i]),
    headerSummary: extractHeaderSummary(content),
  };
}

function firstMatch(content, regexes) {
  for (const regex of regexes) {
    const value = content.match(regex)?.[1]?.trim();
    if (value) return value;
  }
  return undefined;
}

function extractHeaderSummary(content) {
  const lines = content.split(/\r?\n/).slice(0, 35);
  const cleaned = [];
  for (const line of lines) {
    if (/^\s*(?:export|import|const|let|class|interface|type|function)\b/.test(line)) break;
    const text = line
      .replace(/^\s*\/\*\*?\s?/, '')
      .replace(/^\s*\*\s?/, '')
      .replace(/\*\/\s*$/, '')
      .replace(/^\s*\/\/\s?/, '')
      .trim();
    if (!text || /^[-─=]+$/.test(text) || text.startsWith('@') || /^Governing:/i.test(text)) continue;
    cleaned.push(text);
  }
  return cleaned.slice(0, 2).join(' ').trim() || undefined;
}

function parseImportSpecifiers(content) {
  const values = new Set();
  for (const match of content.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g)) {
    values.add(match[1]);
  }
  for (const match of content.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) {
    values.add(match[1]);
  }
  return [...values];
}

function moduleKey(relativePath) {
  const rest = relativePath.replace(/^src\//, '');
  if (!rest.includes('/')) return 'srcRoot';
  return rest.split('/')[0];
}

function buildModule(key, files, scope) {
  const ownedConcerns = [...new Set(files.map((f) => f.metadata.ownedConcern).filter(Boolean))];
  const decisions = [...new Set(files.map((f) => f.metadata.decision).filter(Boolean))];
  const title = key === 'srcRoot' ? 'Public / source root' : humanize(key);
  const kind = inferElementKind(key);
  const sourcePath = key === 'srcRoot' ? posix.join(scope, 'src') : posix.join(scope, 'src', key);
  return {
    key,
    id: `mod_${safeId(key)}`,
    title,
    kind,
    files: [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    ownedConcerns,
    decisions,
    sourcePath,
    sourceUrl: `https://github.com/${config.repository}/tree/${baselineSha}/${encodeGitHubPath(sourcePath)}`,
  };
}

function inferElementKind(key) {
  const normalized = key.toLowerCase();
  if (normalized === 'ports' || normalized.endsWith('ports')) return 'port';
  if (normalized.includes('adapter')) return 'adapter';
  if (normalized.includes('worker')) return 'worker';
  if (normalized.endsWith('store') || normalized === 'stores') return 'store';
  return 'component';
}

function humanize(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function resolveRelativeImport(sourceRelativePath, specifier, fileByRelativePath) {
  const sourceDir = posix.dirname(sourceRelativePath);
  const raw = posix.normalize(posix.join(sourceDir, specifier.split('?')[0].split('#')[0]));
  const noRuntimeExt = raw.replace(/\.(?:mjs|cjs|js|jsx)$/, '');
  const candidates = [
    raw,
    `${noRuntimeExt}.ts`,
    `${noRuntimeExt}.tsx`,
    `${noRuntimeExt}.js`,
    `${noRuntimeExt}.mjs`,
    `${noRuntimeExt}/index.ts`,
    `${noRuntimeExt}/index.tsx`,
    `${raw}/index.ts`,
  ];
  for (const candidate of candidates) {
    const file = fileByRelativePath.get(candidate);
    if (file) return file;
  }
  return undefined;
}

function makeFolder(name, relativePath) {
  return { name, relativePath, folders: new Map(), files: [], recursiveFileCount: 0 };
}

function addInventoryFile(root, file) {
  const parts = file.relativePath.split('/');
  const filename = parts.pop();
  let current = root;
  let currentPath = '';
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    if (!current.folders.has(part)) current.folders.set(part, makeFolder(part, currentPath));
    current = current.folders.get(part);
  }
  current.files.push({ ...file, filename });
}

function countFolderFiles(folder) {
  let total = folder.files.length;
  for (const child of folder.folders.values()) total += countFolderFiles(child);
  folder.recursiveFileCount = total;
  return total;
}

function toInventoryPayload(ctx) {
  return {
    schemaVersion: 1,
    generatedFrom: 'git-tree',
    repository: config.repository,
    baselineRef: config.baselineRef,
    baselineSha,
    packageName: ctx.packageName,
    scope: ctx.path,
    packageConcern: ctx.packageConcern,
    counts: ctx.counts,
    modules: ctx.modules.map((module) => ({
      id: module.id,
      key: module.key,
      title: module.title,
      kind: module.kind,
      provenance: 'STRUCTURE-DERIVED',
      sourcePath: module.sourcePath,
      fileCount: module.files.length,
      ownedConcerns: module.ownedConcerns,
      decisions: module.decisions,
      files: module.files.map((file) => file.relativePath),
    })),
    internalModuleDependencies: ctx.internalEdges,
    selectedWorkspaceDependencies: ctx.workspaceEdges,
    files: ctx.files,
  };
}

function renderLikeC4(allContexts) {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Source baseline: ${config.repository}@${baselineSha}`,
    'model {',
    "  dvt = system 'DVT+ — source-first architecture' {",
    '    #asIs',
    "    description 'Generated from the current Git tree. Package/module structure and dependency arrows are source-derived; no target architecture is promoted to AS-IS.'",
    '    metadata {',
    `      repository '${esc(config.repository)}'`,
    `      baselineSha '${baselineSha}'`,
    `      baselineRef '${esc(config.baselineRef)}'`,
    `      selectedContexts '${allContexts.length}'`,
    '    }',
  ];

  for (const ctx of allContexts) emitLogicalContext(ctx, lines);
  lines.push('  }');

  const inventoryFqns = new Map();
  for (const ctx of allContexts) {
    const inventoryId = `inventory_${safeId(ctx.id)}`;
    const pathToFqn = new Map();
    inventoryFqns.set(ctx.id, pathToFqn);
    lines.push(`  ${inventoryId} = inventory '${esc(ctx.packageName)} — exact Git inventory' {`);
    lines.push('    #sourceDerived');
    lines.push(`    description '${esc(`${ctx.counts.trackedFiles} tracked files from ${ctx.path}@${baselineSha.slice(0, 8)}.`)}'`);
    lines.push('    metadata {');
    lines.push("      provenance 'SOURCE-DERIVED'");
    lines.push(`      packageName '${esc(ctx.packageName)}'`);
    lines.push(`      sourceRoot '${esc(ctx.path)}'`);
    lines.push(`      baselineSha '${baselineSha}'`);
    lines.push(`      trackedFiles '${ctx.counts.trackedFiles}'`);
    lines.push(`      sourceFiles '${ctx.counts.sourceFiles}'`);
    lines.push(`      testFiles '${ctx.counts.testFiles}'`);
    lines.push('    }');
    lines.push(`    link https://github.com/${config.repository}/tree/${baselineSha}/${encodeGitHubPath(ctx.path)} 'Pinned package tree'`);
    emitInventoryChildren(ctx, ctx.root, inventoryId, '    ', lines, pathToFqn);
    lines.push('  }');
  }

  for (const ctx of allContexts) {
    for (const edge of ctx.workspaceEdges) {
      lines.push(
        `  dvt.pkg_${safeId(edge.from)} .uses dvt.pkg_${safeId(edge.to)} 'workspace imports (${edge.count})'`,
      );
    }
  }

  lines.push('}', '', 'views {');
  lines.push('  view dvtSourceFirst of dvt {');
  lines.push("    title 'DVT+ — Source-first bounded contexts'");
  lines.push(`    description 'Current selected bounded contexts generated from main@${baselineSha.slice(0, 8)}. Dependency arrows come from source imports.'`);
  lines.push('    include *');
  lines.push('    autoLayout LeftRight');
  lines.push('  }', '');

  for (const ctx of allContexts) {
    lines.push(`  view ${safeId(ctx.id)}Boundary of dvt.pkg_${safeId(ctx.id)} {`);
    lines.push(`    title '${esc(ctx.packageName)} — source modules and dependencies'`);
    lines.push(`    description '${esc(`STRUCTURE-DERIVED modules from ${ctx.path}/src at ${baselineSha.slice(0, 8)}. Open a module link for its pinned source tree; evidence views list exact files.`)}'`);
    lines.push('    include *');
    lines.push('    autoLayout LeftRight');
    lines.push('  }', '');

    const inventoryId = `inventory_${safeId(ctx.id)}`;
    lines.push(`  view ${safeId(ctx.id)}Inventory of ${inventoryId} {`);
    lines.push(`    title '${esc(ctx.packageName)} — complete Git inventory'`);
    lines.push(`    description '${esc(`${ctx.counts.trackedFiles} tracked files. Folder/file identity is derived from the pinned Git tree.`)}'`);
    lines.push('    include *');
    lines.push('    autoLayout TopBottom');
    lines.push('  }', '');

    const pathToFqn = inventoryFqns.get(ctx.id);
    emitFolderViews(ctx, ctx.root, pathToFqn, lines);
    for (const module of ctx.modules) {
      lines.push(`  view ${safeId(ctx.id)}Files_${safeId(module.key)} {`);
      lines.push(`    title '${esc(ctx.packageName)} — files for ${module.title}'`);
      lines.push(`    description '${esc(`SOURCE-DERIVED evidence for STRUCTURE-DERIVED module ${module.sourcePath}. ${module.files.length} file(s).`)}'`);
      for (const file of module.files) {
        const fqn = pathToFqn.get(file.relativePath);
        if (!fqn) throw new Error(`Missing inventory FQN for ${ctx.id}:${file.relativePath}`);
        lines.push(`    include ${fqn}`);
      }
      lines.push('    autoLayout TopBottom');
      lines.push('  }', '');
    }
  }

  lines.push('}', '');
  return lines.join('\n');
}

function emitLogicalContext(ctx, lines) {
  const packageId = `pkg_${safeId(ctx.id)}`;
  lines.push(`    ${packageId} = package '${esc(ctx.packageName)}' {`);
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
  lines.push(`      link https://github.com/${config.repository}/tree/${baselineSha}/${encodeGitHubPath(ctx.path)} 'Pinned package tree'`);

  for (const module of ctx.modules) {
    lines.push(`      ${module.id} = ${module.kind} '${esc(module.title)}' {`);
    lines.push('        #structureDerived');
    const description = module.ownedConcerns.length
      ? module.ownedConcerns.join(' | ')
      : `Source grouping observed at ${module.sourcePath}.`;
    lines.push(`        description '${esc(description)}'`);
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

function emitInventoryChildren(ctx, folder, parentFqn, indent, lines, pathToFqn) {
  for (const child of sortedFolders(folder)) {
    const id = folderElementId(child.relativePath);
    const fqn = `${parentFqn}.${id}`;
    pathToFqn.set(`${child.relativePath}/`, fqn);
    lines.push(`${indent}${id} = folder '${esc(child.name)}/ — ${child.recursiveFileCount} files' {`);
    lines.push(`${indent}  #structureDerived`);
    lines.push(`${indent}  description 'Directory observed in the pinned Git tree.'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'STRUCTURE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${esc(posix.join(ctx.path, child.relativePath))}'`);
    lines.push(`${indent}    recursiveFileCount '${child.recursiveFileCount}'`);
    lines.push(`${indent}    directFileCount '${child.files.length}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  link https://github.com/${config.repository}/tree/${baselineSha}/${encodeGitHubPath(posix.join(ctx.path, child.relativePath))} 'Pinned directory'`);
    emitInventoryChildren(ctx, child, fqn, `${indent}  `, lines, pathToFqn);
    emitInventoryFiles(child.files, fqn, `${indent}  `, lines, pathToFqn);
    lines.push(`${indent}}`);
  }
  emitInventoryFiles(folder.files, parentFqn, indent, lines, pathToFqn);
}

function emitInventoryFiles(files, parentFqn, indent, lines, pathToFqn) {
  for (const file of [...files].sort((a, b) => a.filename.localeCompare(b.filename))) {
    const id = fileElementId(file);
    const fqn = `${parentFqn}.${id}`;
    if (pathToFqn.has(file.relativePath)) throw new Error(`Duplicate inventory file ${file.relativePath}`);
    pathToFqn.set(file.relativePath, fqn);
    lines.push(`${indent}${id} = file '${esc(file.filename)}' {`);
    lines.push(`${indent}  #sourceDerived`);
    lines.push(`${indent}  description 'Tracked file from the pinned Git tree.'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'SOURCE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${esc(file.path)}'`);
    lines.push(`${indent}    blobSha '${file.blobSha}'`);
    if (file.sizeBytes !== null) lines.push(`${indent}    sizeBytes '${file.sizeBytes}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  link ${file.githubUrl} 'Open pinned source'`);
    lines.push(`${indent}}`);
  }
}

function emitFolderViews(ctx, folder, pathToFqn, lines) {
  for (const child of sortedFolders(folder)) {
    const fqn = pathToFqn.get(`${child.relativePath}/`);
    if (!fqn) throw new Error(`Missing folder FQN ${ctx.id}:${child.relativePath}`);
    lines.push(`  view ${safeId(ctx.id)}Dir_${safeId(child.relativePath)} of ${fqn} {`);
    lines.push(`    title '${esc(ctx.packageName)} — ${esc(child.relativePath)}/ (${child.recursiveFileCount} files)'`);
    lines.push("    description 'STRUCTURE-DERIVED directory view; child file identity comes from Git.'");
    lines.push('    include *');
    lines.push('    autoLayout TopBottom');
    lines.push('  }', '');
    emitFolderViews(ctx, child, pathToFqn, lines);
  }
}

function sortedFolders(folder) {
  return [...folder.folders.values()].sort((a, b) => a.name.localeCompare(b.name));
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

function folderElementId(relativePath) {
  return `dir_${safeId(relativePath)}`;
}

function fileElementId(file) {
  return `file_${safeId(file.relativePath)}_${file.blobSha.slice(0, 7)}`;
}

function encodeGitHubPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function esc(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ');
}
