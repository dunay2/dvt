import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const architectureDir = dirname(scriptDir);
const baseline = JSON.parse(readFileSync(join(architectureDir, 'planner-source-baseline.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(architectureDir, 'planner-components.json'), 'utf8'));
const generatedDir = join(architectureDir, 'generated');
const { repository, baselineSha, scope, modelId, displayName, architectureOwner } = baseline;

if (![repository, baselineSha, scope, modelId, displayName, architectureOwner].every(Boolean)) {
  throw new Error('planner-source-baseline.json is incomplete');
}

const git = (args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trimEnd();

git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const files = git(['ls-tree', '-r', '-l', baselineSha, '--', scope])
  .split(/\r?\n/)
  .filter(Boolean)
  .map(parseTreeLine)
  .filter(Boolean)
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

if (files.length === 0) throw new Error(`No tracked files under ${scope}@${baselineSha}`);

const fileByRelativePath = new Map(files.map((file) => [file.relativePath, file]));
const components = manifest.components.map((component) => {
  const selected = new Map();
  for (const exactPath of component.paths ?? []) {
    const file = fileByRelativePath.get(exactPath);
    if (!file) throw new Error(`Component ${component.id} references missing file: ${exactPath}`);
    selected.set(file.relativePath, file);
  }
  for (const prefix of component.prefixes ?? []) {
    const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
    const matches = files.filter((file) => file.relativePath.startsWith(normalized));
    if (matches.length === 0) throw new Error(`Component ${component.id} prefix matched no files: ${prefix}`);
    for (const file of matches) selected.set(file.relativePath, file);
  }
  const evidenceFiles = [...selected.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (evidenceFiles.length === 0) throw new Error(`Component ${component.id} has no evidence files`);
  return { ...component, evidenceFiles };
});

const root = makeFolder('', scope);
for (const file of files) addFile(root, file);
computeCounts(root);

const counts = {
  trackedFiles: files.length,
  sourceFiles: files.filter((f) => f.relativePath.startsWith('src/')).length,
  testFiles: files.filter((f) => f.relativePath.startsWith('test/')).length,
  docsFiles: files.filter((f) => f.relativePath.startsWith('docs/')).length,
  exampleFiles: files.filter((f) => f.relativePath.startsWith('examples/')).length,
  packageRootFiles: files.filter((f) => !f.relativePath.includes('/')).length,
  filesWithOwnedConcern: files.filter((f) => Boolean(f.ownedConcern)).length,
  filesWithDecision: files.filter((f) => Boolean(f.decision)).length,
};

const payload = {
  schemaVersion: 1,
  generatedFrom: 'git-tree',
  repository,
  baselineSha,
  scope,
  counts,
  files,
  componentMappings: components.map((component) => ({
    id: component.id,
    title: component.title,
    provenance: 'ARCHITECTURE-DECLARED',
    rationale: component.rationale ?? null,
    fileCount: component.evidenceFiles.length,
    files: component.evidenceFiles.map((file) => file.relativePath),
  })),
};
const canonical = JSON.stringify(payload, null, 2) + '\n';
const inventorySha256 = createHash('sha256').update(canonical).digest('hex');
const inventory = { ...payload, inventorySha256 };

mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, 'planner-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
writeFileSync(join(generatedDir, 'planner-source.c4'), generateLikeC4(root, components, inventory));

console.log(
  `Generated Planner inventory: ${counts.trackedFiles} tracked, ${counts.sourceFiles} src, ${counts.testFiles} tests, digest ${inventorySha256}`
);

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
    githubUrl: `https://github.com/${repository}/blob/${baselineSha}/${encodeGitHubPath(path)}`,
    ...parseSourceMetadata(path, relativePath),
  };
}

function parseSourceMetadata(path, relativePath) {
  if (!/\.(?:[cm]?js|jsx|ts|tsx)$/.test(relativePath)) return {};
  let content;
  try {
    content = git(['show', `${baselineSha}:${path}`]);
  } catch {
    return {};
  }
  return {
    ownedConcern: firstMatch(content, [
      /@ownedConcern\s+([^\r\n*]+)/i,
      /Owned concern:\s*([^\r\n*]+)/i,
    ]),
    baseline: allMatches(content, /@baseline\s+([^\r\n*]+)/gi),
    decision: firstMatch(content, [/@decision\s+([^\r\n*]+)/i]),
    consequence: firstMatch(content, [/@consequence\s+([^\r\n*]+)/i]),
  };
}

function firstMatch(content, regexes) {
  for (const regex of regexes) {
    const value = content.match(regex)?.[1]?.trim();
    if (value) return value;
  }
  return undefined;
}

function allMatches(content, regex) {
  const values = [...content.matchAll(regex)].map((match) => match[1]?.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

function encodeGitHubPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function makeFolder(name, relativePath) {
  return { name, relativePath, folders: new Map(), files: [], recursiveFileCount: 0 };
}

function addFile(rootFolder, file) {
  const segments = file.relativePath.split('/');
  const filename = segments.pop();
  let cursor = rootFolder;
  let currentPath = '';
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (!cursor.folders.has(segment)) cursor.folders.set(segment, makeFolder(segment, currentPath));
    cursor = cursor.folders.get(segment);
  }
  cursor.files.push({ ...file, filename });
}

function computeCounts(folder) {
  let count = folder.files.length;
  for (const child of folder.folders.values()) count += computeCounts(child);
  folder.recursiveFileCount = count;
  return count;
}

function generateLikeC4(rootFolder, mappedComponents, inventoryData) {
  const pathToFqn = new Map();
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Source: git tree ${repository}@${baselineSha}:${scope}`,
    'model {',
    `  ${modelId} = inventory '${displayName} source inventory — generated from Git' {`,
    '    #sourceDerived',
    "    description 'Machine-generated from the exact Git tree. Folder structure is STRUCTURE-DERIVED; file identity is SOURCE-DERIVED.'",
    '    metadata {',
    "      provenance 'SOURCE-DERIVED'",
    `      architectureOwner '${escapeDsl(architectureOwner)}'`,
    `      sourceRoot '${escapeDsl(scope)}'`,
    `      baselineSha '${baselineSha}'`,
    `      trackedFiles '${inventoryData.counts.trackedFiles}'`,
    `      sourceFiles '${inventoryData.counts.sourceFiles}'`,
    `      testFiles '${inventoryData.counts.testFiles}'`,
    `      inventorySha256 '${inventoryData.inventorySha256}'`,
    '    }',
    `    link https://github.com/${repository}/tree/${baselineSha}/${encodeGitHubPath(scope)} 'Pinned package tree'`,
    `    navigateTo ${modelId}Inventory`,
  ];
  emitFolderChildren(rootFolder, modelId, '    ', lines, pathToFqn);
  lines.push('  }', '}', '', 'views {');
  lines.push(`  view ${modelId}Inventory of ${modelId} {`);
  lines.push(`    title '${displayName} — Complete source inventory'`);
  lines.push(
    `    description 'Generated from Git at ${baselineSha.slice(0, 8)}. ${inventoryData.counts.trackedFiles} tracked files; drill into folders to reach every file.'`
  );
  lines.push('    include *', '    autoLayout TopBottom', '  }', '');
  emitFolderViews(rootFolder, lines, pathToFqn);
  for (const component of mappedComponents) {
    lines.push(`  view ${componentViewId(component.id)} {`);
    lines.push(`    title 'Files — ${escapeDsl(component.title)}'`);
    lines.push(
      `    description 'ARCHITECTURE-DECLARED mapping over SOURCE-DERIVED Git files. ${component.evidenceFiles.length} evidence file(s).'`
    );
    for (const file of component.evidenceFiles) {
      const fqn = pathToFqn.get(file.relativePath);
      if (!fqn) throw new Error(`No LikeC4 element for ${file.relativePath}`);
      lines.push(`    include ${fqn}`);
    }
    lines.push('    autoLayout TopBottom', '  }', '');
  }
  lines.push('}', '');
  return lines.join('\n');
}

function emitFolderChildren(folder, parentFqn, indent, lines, pathToFqn) {
  for (const child of [...folder.folders.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const id = elementId('dir', child.relativePath);
    const fqn = `${parentFqn}.${id}`;
    pathToFqn.set(`${child.relativePath}/`, fqn);
    lines.push(`${indent}${id} = folder '${escapeDsl(child.name)}/ — ${child.recursiveFileCount} files' {`);
    lines.push(`${indent}  #structureDerived`);
    lines.push(`${indent}  description 'Directory observed in the pinned Git tree.'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'STRUCTURE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${escapeDsl(posix.join(scope, child.relativePath))}'`);
    lines.push(`${indent}    recursiveFileCount '${child.recursiveFileCount}'`);
    lines.push(`${indent}    directFileCount '${child.files.length}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    lines.push(`${indent}  }`);
    lines.push(
      `${indent}  link https://github.com/${repository}/tree/${baselineSha}/${encodeGitHubPath(posix.join(scope, child.relativePath))} 'Pinned directory'`
    );
    lines.push(`${indent}  navigateTo ${folderViewId(child.relativePath)}`);
    emitFolderChildren(child, fqn, `${indent}  `, lines, pathToFqn);
    emitFiles(child.files, fqn, `${indent}  `, lines, pathToFqn);
    lines.push(`${indent}}`);
  }
  emitFiles(folder.files, parentFqn, indent, lines, pathToFqn);
}

function emitFiles(filesInFolder, parentFqn, indent, lines, pathToFqn) {
  for (const file of [...filesInFolder].sort((a, b) => a.filename.localeCompare(b.filename))) {
    const id = elementId('file', file.relativePath);
    pathToFqn.set(file.relativePath, `${parentFqn}.${id}`);
    lines.push(`${indent}${id} = file '${escapeDsl(file.filename)}' {`);
    lines.push(`${indent}  #sourceDerived`);
    lines.push(`${indent}  description '${escapeDsl(file.ownedConcern ?? 'Tracked file from the pinned Git tree.')}'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'SOURCE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${escapeDsl(file.path)}'`);
    lines.push(`${indent}    blobSha '${file.blobSha}'`);
    if (file.sizeBytes !== null) lines.push(`${indent}    sizeBytes '${file.sizeBytes}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    if (file.ownedConcern) lines.push(`${indent}    ownedConcern '${escapeDsl(file.ownedConcern)}'`);
    if (file.decision) lines.push(`${indent}    decision '${escapeDsl(file.decision)}'`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  link ${file.githubUrl} 'Open pinned source'`);
    lines.push(`${indent}}`);
  }
}

function emitFolderViews(folder, lines, pathToFqn) {
  for (const child of [...folder.folders.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const fqn = pathToFqn.get(`${child.relativePath}/`);
    lines.push(`  view ${folderViewId(child.relativePath)} of ${fqn} {`);
    lines.push(`    title 'Source — ${escapeDsl(child.relativePath)}/ (${child.recursiveFileCount} files)'`);
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
  return `plannerFiles_${id.replace(/[^A-Za-z0-9_-]+/g, '_')}`;
}

function escapeDsl(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
