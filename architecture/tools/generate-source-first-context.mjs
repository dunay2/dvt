import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const contextId = process.argv[2];
if (!contextId) throw new Error('Usage: node generate-source-first-context.mjs <context>');

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(architectureDir);
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const baselinePath = join(contextsDir, `${contextId}-source-baseline.json`);
const componentsPath = join(contextsDir, `${contextId}-components.json`);
const logicalPath = join(architectureDir, `${contextId}.c4`);

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const manifest = JSON.parse(readFileSync(componentsPath, 'utf8'));
const logicalSource = readFileSync(logicalPath, 'utf8');
const configuredBaselineSha = baseline.baselineSha;
const baselineSha = process.env.DVT_ARCH_BASELINE_SHA || configuredBaselineSha;
const { repository, scope, displayName, architectureOwner } = baseline;
const logicalModelId = parseLogicalModelId(logicalSource, contextId);
const configuredModelId = baseline.modelId ?? null;
const modelId = deriveSourceModelId(logicalModelId);

if (![repository, baselineSha, scope, displayName, architectureOwner].every(Boolean)) {
  throw new Error(`${baselinePath} is incomplete`);
}

const git = (args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trimEnd();

git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const files = git(['ls-tree', '-r', '-l', baselineSha, '--', scope])
  .split(/\r?\n/)
  .filter(Boolean)
  .map(parseTreeLine)
  .filter(Boolean)
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

if (!files.length) throw new Error(`No tracked files under ${scope}@${baselineSha}`);

const byPath = new Map(files.map((file) => [file.relativePath, file]));
const components = (manifest.components ?? []).map((component) => {
  const selected = new Map();
  for (const exactPath of component.paths ?? []) {
    const file = byPath.get(exactPath);
    if (!file) throw new Error(`${component.id} references missing file: ${exactPath}`);
    selected.set(file.relativePath, file);
  }
  for (const prefix of component.prefixes ?? []) {
    const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
    const matches = files.filter((file) => file.relativePath.startsWith(normalized));
    if (!matches.length) throw new Error(`${component.id} prefix matched no files: ${prefix}`);
    for (const file of matches) selected.set(file.relativePath, file);
  }
  const evidenceFiles = [...selected.values()].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath),
  );
  if (!evidenceFiles.length) throw new Error(`${component.id} has no evidence files`);
  return { ...component, evidenceFiles };
});

const counts = {
  trackedFiles: files.length,
  sourceFiles: files.filter((f) => f.relativePath.startsWith('src/')).length,
  testFiles: files.filter((f) => isTestFile(f.relativePath)).length,
  docsFiles: files.filter((f) => f.relativePath.startsWith('docs/')).length,
  packageRootFiles: files.filter((f) => !f.relativePath.includes('/')).length,
  filesWithOwnedConcern: files.filter((f) => Boolean(f.ownedConcern)).length,
  filesWithDecision: files.filter((f) => Boolean(f.decision)).length,
};

const payload = {
  schemaVersion: 4,
  generatedFrom: 'git-tree',
  repository,
  baselineSha,
  configuredBaselineSha: configuredBaselineSha ?? null,
  scope,
  logicalModelId,
  sourceModelId: modelId,
  configuredModelId,
  counts,
  files,
  componentMappings: components.map((component) => ({
    id: component.id,
    title: component.title,
    provenance: 'ARCHITECTURE-DECLARED',
    classificationRole: component.classificationRole ?? 'owner',
    rationale: component.rationale ?? null,
    fileCount: component.evidenceFiles.length,
    files: component.evidenceFiles.map((file) => file.relativePath),
  })),
};

const canonical = JSON.stringify(payload, null, 2) + '\n';
const inventory = {
  ...payload,
  inventorySha256: createHash('sha256').update(canonical).digest('hex'),
};

mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  join(generatedDir, `${contextId}-inventory.json`),
  JSON.stringify(inventory, null, 2) + '\n',
);
writeFileSync(join(generatedDir, `${contextId}-source.c4`), renderSourceModel(inventory));

console.log(
  `Generated ${displayName}: ${counts.trackedFiles} tracked, ${counts.sourceFiles} src, ` +
    `${counts.testFiles} tests @ ${baselineSha.slice(0, 8)}, source=${modelId}, digest ${inventory.inventorySha256}`,
);

function parseLogicalModelId(source, id) {
  const match = source.match(
    /model\s*\{\s*([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(?:system|app|package|component|port|adapter|worker|store|external|contract|inventory)\b/,
  );
  if (!match?.[1]) throw new Error(`Cannot resolve logical model id from architecture/${id}.c4`);
  return match[1];
}

function deriveSourceModelId(logicalId) {
  return logicalId.endsWith('Model')
    ? `${logicalId.slice(0, -'Model'.length)}Source`
    : `${logicalId}Source`;
}

function isTestFile(relativePath) {
  return (
    /^(?:test|tests|__tests__)\//.test(relativePath) ||
    /\.(?:test|spec|cy)\.[cm]?[jt]sx?$/.test(relativePath) ||
    /\/(?:test|tests|__tests__)\//.test(relativePath)
  );
}

function parseTreeLine(line) {
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
    githubUrl: `https://github.com/${repository}/blob/${baselineSha}/${urlPath(path)}`,
    ...sourceMetadata(path, relativePath),
  };
}

function sourceMetadata(path, relativePath) {
  if (!/\.(?:[cm]?js|jsx|ts|tsx)$/.test(relativePath)) return {};

  let content;
  try {
    content = git(['show', `${baselineSha}:${path}`]);
  } catch {
    return {};
  }

  const baselineTags = [...content.matchAll(/@baseline\s+([^\r\n*]+)/gi)]
    .map((match) => match[1]?.trim())
    .filter(Boolean);

  return {
    ownedConcern: first(content, [
      /@ownedConcern\s+([^\r\n*]+)/i,
      /Owned concern:\s*([^\r\n*]+)/i,
    ]),
    decision: first(content, [/@decision\s+([^\r\n*]+)/i]),
    consequence: first(content, [/@consequence\s+([^\r\n*]+)/i]),
    baseline: baselineTags.length ? baselineTags : undefined,
  };
}

function first(content, regexes) {
  for (const regex of regexes) {
    const match = content.match(regex);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}

function renderSourceModel(inventory) {
  const root = folder('', '');
  for (const file of inventory.files) addFile(root, file);
  countFiles(root);

  const pathToFqn = new Map();
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Source: git tree ${repository}@${baselineSha}:${scope}`,
    'model {',
    `  ${modelId} = inventory '${esc(displayName)} source inventory — generated from Git' {`,
    '    #sourceDerived',
    "    description 'Machine-generated from the exact Git tree. Folder structure is STRUCTURE-DERIVED; file identity is SOURCE-DERIVED.'",
    '    metadata {',
    "      provenance 'SOURCE-DERIVED'",
    `      architectureOwner '${esc(architectureOwner)}'`,
    `      sourceRoot '${esc(scope)}'`,
    `      baselineSha '${baselineSha}'`,
    `      trackedFiles '${inventory.counts.trackedFiles}'`,
    `      sourceFiles '${inventory.counts.sourceFiles}'`,
    `      testFiles '${inventory.counts.testFiles}'`,
    `      inventorySha256 '${inventory.inventorySha256}'`,
    '    }',
    `    link https://github.com/${repository}/tree/${baselineSha}/${urlPath(scope)} 'Pinned package tree'`,
  ];
  emitChildren(root, modelId, '    ', lines, pathToFqn);
  lines.push('  }', '}', '', 'views {');
  lines.push(`  view ${modelId}Inventory of ${modelId} {`);
  lines.push(`    title '${esc(displayName)} — Complete source inventory'`);
  lines.push(
    `    description 'Generated from Git at ${baselineSha.slice(0, 8)}. ${inventory.counts.trackedFiles} tracked files; drill into folders to reach every file.'`,
  );
  lines.push('    include *', '    autoLayout TopBottom', '  }', '');
  emitFolderViews(root, lines, pathToFqn);
  for (const component of inventory.componentMappings) {
    lines.push(`  view ${componentViewId(component.id)} {`);
    lines.push(`    title 'Files — ${esc(component.title)}'`);
    lines.push(
      `    description 'ARCHITECTURE-DECLARED ${esc(component.classificationRole)} mapping over SOURCE-DERIVED Git files. ${component.fileCount} evidence file(s).'`,
    );
    for (const relativePath of component.files) {
      const fqn = pathToFqn.get(relativePath);
      if (!fqn) throw new Error(`No generated LikeC4 element for ${relativePath}`);
      lines.push(`    include ${fqn}`);
    }
    lines.push('    autoLayout TopBottom', '  }', '');
  }
  lines.push('}', '');
  return lines.join('\n');
}

function folder(name, relativePath) {
  return { name, relativePath, folders: new Map(), files: [], recursiveFileCount: 0 };
}

function addFile(rootFolder, file) {
  const parts = file.relativePath.split('/');
  const filename = parts.pop();
  let current = rootFolder;
  let currentPath = '';
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    if (!current.folders.has(part)) current.folders.set(part, folder(part, currentPath));
    current = current.folders.get(part);
  }
  current.files.push({ ...file, filename });
}

function countFiles(current) {
  let total = current.files.length;
  for (const child of current.folders.values()) total += countFiles(child);
  current.recursiveFileCount = total;
  return total;
}

function emitChildren(current, parentFqn, indent, lines, pathToFqn) {
  for (const child of [...current.folders.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const id = elementId('dir', child.relativePath);
    const fqn = `${parentFqn}.${id}`;
    pathToFqn.set(`${child.relativePath}/`, fqn);
    lines.push(`${indent}${id} = folder '${esc(child.name)}/ — ${child.recursiveFileCount} files' {`);
    lines.push(`${indent}  #structureDerived`);
    lines.push(`${indent}  description 'Directory observed in the pinned Git tree.'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'STRUCTURE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${esc(posix.join(scope, child.relativePath))}'`);
    lines.push(`${indent}    recursiveFileCount '${child.recursiveFileCount}'`);
    lines.push(`${indent}    directFileCount '${child.files.length}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    lines.push(`${indent}  }`);
    lines.push(
      `${indent}  link https://github.com/${repository}/tree/${baselineSha}/${urlPath(posix.join(scope, child.relativePath))} 'Pinned directory'`,
    );
    emitChildren(child, fqn, `${indent}  `, lines, pathToFqn);
    emitDirectFiles(child.files, fqn, `${indent}  `, lines, pathToFqn);
    lines.push(`${indent}}`);
  }
  emitDirectFiles(current.files, parentFqn, indent, lines, pathToFqn);
}

function emitDirectFiles(filesInFolder, parentFqn, indent, lines, pathToFqn) {
  for (const file of [...filesInFolder].sort((a, b) => a.filename.localeCompare(b.filename))) {
    const id = elementId('file', file.relativePath);
    pathToFqn.set(file.relativePath, `${parentFqn}.${id}`);
    lines.push(`${indent}${id} = file '${esc(file.filename)}' {`);
    lines.push(`${indent}  #sourceDerived`);
    lines.push(`${indent}  description '${esc(file.ownedConcern ?? 'Tracked file from the pinned Git tree.')}'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'SOURCE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${esc(file.path)}'`);
    lines.push(`${indent}    blobSha '${file.blobSha}'`);
    if (file.sizeBytes !== null) lines.push(`${indent}    sizeBytes '${file.sizeBytes}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    if (file.ownedConcern) lines.push(`${indent}    ownedConcern '${esc(file.ownedConcern)}'`);
    if (file.decision) lines.push(`${indent}    decision '${esc(file.decision)}'`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  link ${file.githubUrl} 'Open pinned source'`);
    lines.push(`${indent}}`);
  }
}

function emitFolderViews(current, lines, pathToFqn) {
  for (const child of [...current.folders.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const fqn = pathToFqn.get(`${child.relativePath}/`);
    lines.push(`  view ${folderViewId(child.relativePath)} of ${fqn} {`);
    lines.push(`    title 'Source — ${esc(child.relativePath)}/ (${child.recursiveFileCount} files)'`);
    lines.push("    description 'STRUCTURE-DERIVED directory view; child files are SOURCE-DERIVED from Git.'");
    lines.push('    include *', '    autoLayout TopBottom', '  }', '');
    emitFolderViews(child, lines, pathToFqn);
  }
}

function elementId(prefix, value) {
  const stem = value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^([^A-Za-z_])/, '_$1').slice(-48);
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 8);
  return `${prefix}_${stem || 'root'}_${hash}`;
}

function folderViewId(relativePath) {
  return `${modelId}_${elementId('dir', relativePath)}`;
}

function componentViewId(id) {
  return `${modelId.replace(/Source$/, '')}Files_${id.replace(/[^A-Za-z0-9_-]+/g, '_')}`;
}

function urlPath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
