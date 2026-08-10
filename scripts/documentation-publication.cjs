#!/usr/bin/env node
/**
 * Owned concern: assemble and validate the disposable documentation publication projection.
 * Command/query rails: `GeneratePlanningDerivedSurfaces`, `ReadArchitectureDesignAuthority`,
 * `QueryDocumentationConsultationPath`, and `ListDocumentationLifecycleFacts`.
 */
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} = require('node:fs');
const { dirname, isAbsolute, join, relative, resolve, sep } = require('node:path');
const { Client } = require('pg');
const { dump: dumpYaml, load: loadYaml } = require('js-yaml');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const {
  readDocumentationLifecycleRows,
} = require('./planning-db/queries/documentation-lifecycle-query.cjs');

class DocumentationPublicationPolicy {
  constructor(options = {}) {
    this.repoRoot = resolve(options.repoRoot || resolve(__dirname, '..'));
    this.generatedRoot = resolve(this.repoRoot, '.generated-docs');
    this.policyPath = resolve(
      options.policyPath || join(this.repoRoot, 'docs', 'generated-docs-policy.json')
    );
    this.policy = options.policy || JSON.parse(readFileSync(this.policyPath, 'utf8'));
  }

  static toPosix(value) {
    return value.split(sep).join('/');
  }

  static walkFiles(root) {
    if (!existsSync(root)) return [];
    const files = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const absolutePath = join(root, entry.name);
      if (entry.isDirectory()) {
        files.push(...DocumentationPublicationPolicy.walkFiles(absolutePath));
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
    return files;
  }

  static globToRegExp(pattern) {
    let expression = '^';
    for (let index = 0; index < pattern.length; index += 1) {
      const character = pattern[index];
      if (character === '*' && pattern[index + 1] === '*') {
        expression += '.*';
        index += 1;
      } else if (character === '*') {
        expression += '[^/]*';
      } else if (character === '?') {
        expression += '[^/]';
      } else {
        expression += character.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&');
      }
    }
    return new RegExp(`${expression}$`, 'u');
  }

  static assertInside(root, candidate, label) {
    const relativePath = relative(root, candidate);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new Error(`${label} escapes ${DocumentationPublicationPolicy.toPosix(root)}.`);
    }
  }

  generatorCommands() {
    return [
      ...new Set(
        this.policy.artifactClasses
          .filter((artifactClass) => artifactClass.publication?.enabled === true)
          .map((artifactClass) => artifactClass.generatorCommand)
          .filter((command) => typeof command === 'string' && command.trim() !== '')
      ),
    ];
  }

  declaredRoutes() {
    const routes = [];
    for (const artifactClass of this.policy.artifactClasses || []) {
      if (artifactClass.publication?.enabled !== true) continue;
      for (const artifact of artifactClass.artifacts || []) {
        const normalizedArtifact = DocumentationPublicationPolicy.toPosix(String(artifact));
        if (/[*?]/u.test(normalizedArtifact)) continue;
        const absolutePath = resolve(this.repoRoot, normalizedArtifact);
        DocumentationPublicationPolicy.assertInside(
          this.generatedRoot,
          absolutePath,
          `Generated artifact ${normalizedArtifact}`
        );
        const route = normalizedArtifact.replace(/^\.generated-docs\//u, '');
        if (route.endsWith('.md')) routes.push(route);
      }
    }
    return [...new Set(routes)].sort((left, right) => left.localeCompare(right, 'en'));
  }

  generatedSources() {
    const sources = [];
    for (const artifactClass of this.policy.artifactClasses || []) {
      if (artifactClass.publication?.enabled !== true) continue;
      if (artifactClass.tracking !== 'untracked') {
        throw new Error(
          `Published generated artifact class ${artifactClass.id} must remain untracked.`
        );
      }
      if (artifactClass.manualEditPolicy !== 'generator-owned') {
        throw new Error(
          `Published generated artifact class ${artifactClass.id} must be generator-owned.`
        );
      }

      for (const artifact of artifactClass.artifacts || []) {
        const normalizedArtifact = DocumentationPublicationPolicy.toPosix(String(artifact));
        const absolutePattern = resolve(this.repoRoot, normalizedArtifact);
        DocumentationPublicationPolicy.assertInside(
          this.generatedRoot,
          absolutePattern,
          `Generated artifact ${normalizedArtifact}`
        );
        const matcher = DocumentationPublicationPolicy.globToRegExp(normalizedArtifact);
        const candidates = /[*?]/u.test(normalizedArtifact)
          ? DocumentationPublicationPolicy.walkFiles(this.generatedRoot).filter((candidate) =>
              matcher.test(
                DocumentationPublicationPolicy.toPosix(relative(this.repoRoot, candidate))
              )
            )
          : [absolutePattern];

        if (candidates.length === 0 || candidates.some((candidate) => !existsSync(candidate))) {
          throw new Error(`Missing generated publication source ${normalizedArtifact}.`);
        }

        for (const absolutePath of candidates) {
          const sourcePath = DocumentationPublicationPolicy.toPosix(
            relative(this.repoRoot, absolutePath)
          );
          const route = sourcePath.replace(/^\.generated-docs\//u, '');
          if (!route.endsWith('.md')) continue;
          sources.push({
            artifactClassId: artifactClass.id,
            absolutePath,
            route,
            sourcePath,
          });
        }
      }
    }

    return sources.sort((left, right) => left.route.localeCompare(right.route, 'en'));
  }

  isHistoricalPath(sourcePath) {
    const segments = DocumentationPublicationPolicy.toPosix(sourcePath).toLowerCase().split('/');
    return segments.some((segment) =>
      ['archive', '_archive', 'superseded', 'disposable'].includes(segment)
    );
  }

  assertLifecycleAuthority(sourcePath, lifecycleRow) {
    if (!lifecycleRow) {
      throw new Error(`Missing Planning DB lifecycle authority for ${sourcePath}.`);
    }
    const gapKind = String(
      lifecycleRow.lifecycle_gap_kind || lifecycleRow.lifecycleGapKind || 'none'
    ).toLowerCase();
    const canonicality = String(lifecycleRow.canonicality || '').toLowerCase();
    const duplicateCount = Number(lifecycleRow.duplicate_count ?? lifecycleRow.duplicateCount ?? 0);
    const canonicalCounterpartCount = Number(
      lifecycleRow.canonical_counterpart_count ?? lifecycleRow.canonicalCounterpartCount ?? 0
    );
    const isDuplicate =
      lifecycleRow.is_duplicate === true || lifecycleRow.isDuplicate === true || duplicateCount > 0;
    if (
      gapKind === 'canonical_duplicate' ||
      (canonicality === 'canonical' && isDuplicate && canonicalCounterpartCount > 1)
    ) {
      throw new Error(
        `Ambiguous Planning DB lifecycle authority for ${sourcePath}: ${gapKind}, canonicality=${canonicality}, duplicateCount=${duplicateCount}.`
      );
    }
  }

  isPublishable(sourcePath, lifecycleRow) {
    this.assertLifecycleAuthority(sourcePath, lifecycleRow);
    if (this.isHistoricalPath(sourcePath)) return false;
    const lifecycle = String(
      lifecycleRow.lifecycle_state || lifecycleRow.lifecycleState || lifecycleRow.status || ''
    ).toLowerCase();
    return ![
      'archive',
      'archived',
      'discarded',
      'disposable',
      'rejected',
      'retired',
      'superseded',
    ].includes(lifecycle);
  }

  isNavigable(sourcePath, lifecycleRow = {}) {
    return this.isPublishable(sourcePath, lifecycleRow);
  }

  isDefaultNavigationEntry(source, lifecycleRow = {}) {
    if (source.artifactClassId) return true;
    if (!this.isNavigable(source.sourcePath, lifecycleRow)) return false;
    return source.route === 'index.md' || source.route.endsWith('/index.md');
  }
}

class DocumentationPublicationAssembler {
  constructor(options = {}) {
    this.repoRoot = resolve(options.repoRoot || resolve(__dirname, '..'));
    this.docsRoot = resolve(options.docsRoot || join(this.repoRoot, 'docs'));
    this.generatedRoot = resolve(options.generatedRoot || join(this.repoRoot, '.generated-docs'));
    this.outputRoot = resolve(options.outputRoot || join(this.generatedRoot, 'publication'));
    this.configPath = resolve(options.configPath || join(this.generatedRoot, 'zensical.yml'));
    this.manifestPath = resolve(
      options.manifestPath || join(this.generatedRoot, 'documentation-publication-manifest.json')
    );
    this.canonicalConfigPath = resolve(
      options.canonicalConfigPath || join(this.repoRoot, 'zensical.yml')
    );
    this.lifecycleRows = options.lifecycleRows;
    this.runCommand = options.runCommand;
    this.readGitSha = options.readGitSha;
    this.trackedDocumentationPaths = options.trackedDocumentationPaths;
    this.policy =
      options.policy ||
      new DocumentationPublicationPolicy({
        repoRoot: this.repoRoot,
        policyPath: options.policyPath,
      });

    DocumentationPublicationPolicy.assertInside(
      this.generatedRoot,
      this.outputRoot,
      'Publication destination'
    );
  }

  run(command) {
    if (this.runCommand) return this.runCommand(command);
    const result = spawnSync(command, {
      cwd: this.repoRoot,
      encoding: 'utf8',
      shell: true,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Documentation publication command failed (${result.status}): ${command}`);
    }
    return undefined;
  }

  async resolveLifecycleRows() {
    if (Array.isArray(this.lifecycleRows)) return this.lifecycleRows;
    const client = new Client({
      connectionString: process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl,
    });
    try {
      await client.connect();
      return await readDocumentationLifecycleRows(client, { limit: 100000 });
    } finally {
      await client.end();
    }
  }

  authoredMarkdownSources() {
    return this.resolveTrackedDocumentationPaths()
      .filter((sourcePath) => sourcePath.endsWith('.md'))
      .map((sourcePath) => {
        const absolutePath = resolve(this.repoRoot, sourcePath);
        return {
          absolutePath,
          route: DocumentationPublicationPolicy.toPosix(relative(this.docsRoot, absolutePath)),
          sourcePath,
        };
      })
      .sort((left, right) => left.route.localeCompare(right.route, 'en'));
  }

  authoredSupportingSources() {
    return this.resolveTrackedDocumentationPaths()
      .filter((sourcePath) => !sourcePath.endsWith('.md'))
      .map((sourcePath) => {
        const absolutePath = resolve(this.repoRoot, sourcePath);
        return {
          absolutePath,
          route: DocumentationPublicationPolicy.toPosix(relative(this.docsRoot, absolutePath)),
          sourcePath,
        };
      })
      .filter((source) => !this.policy.isHistoricalPath(source.sourcePath))
      .sort((left, right) => left.route.localeCompare(right.route, 'en'));
  }

  resolveTrackedDocumentationPaths() {
    if (Array.isArray(this.trackedDocumentationPaths)) {
      return [
        ...new Set(this.trackedDocumentationPaths.map(DocumentationPublicationPolicy.toPosix)),
      ]
        .filter((sourcePath) => existsSync(resolve(this.repoRoot, sourcePath)))
        .sort((left, right) => left.localeCompare(right, 'en'));
    }
    const result = spawnSync('git', ['ls-files', '--', 'docs/*', 'docs/**/*'], {
      cwd: this.repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(
        `Cannot resolve Git-owned documentation inputs: ${String(result.stderr).trim()}.`
      );
    }
    return [...new Set(String(result.stdout).split(/\r?\n/u))]
      .map((sourcePath) => DocumentationPublicationPolicy.toPosix(sourcePath.trim()))
      .filter((sourcePath) => sourcePath && existsSync(resolve(this.repoRoot, sourcePath)))
      .sort((left, right) => left.localeCompare(right, 'en'));
  }

  currentGitSha() {
    if (this.readGitSha) return String(this.readGitSha()).trim();
    const result = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: this.repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Cannot resolve publication Git input: ${String(result.stderr).trim()}.`);
    }
    return String(result.stdout).trim();
  }

  static hashValue(value) {
    return createHash('sha256').update(value).digest('hex');
  }

  static hashSources(sources) {
    const hash = createHash('sha256');
    for (const source of [...sources].sort((left, right) =>
      left.sourcePath.localeCompare(right.sourcePath, 'en')
    )) {
      hash.update(source.sourcePath);
      hash.update('\0');
      hash.update(readFileSync(source.absolutePath));
      hash.update('\0');
    }
    return hash.digest('hex');
  }

  buildLifecycleState(lifecycleRows, authoredSources, options = {}) {
    const lifecycleByPath = new Map();
    for (const row of lifecycleRows) {
      const sourcePath = DocumentationPublicationPolicy.toPosix(
        String(row.document_path || row.documentPath || '')
      );
      if (!sourcePath) continue;
      if (lifecycleByPath.has(sourcePath)) {
        throw new Error(`Duplicate Planning DB lifecycle authority for ${sourcePath}.`);
      }
      lifecycleByPath.set(sourcePath, row);
    }

    const normalizedRows = [];
    const publishableSources = [];
    for (const source of authoredSources) {
      const row = lifecycleByPath.get(source.sourcePath);
      this.policy.assertLifecycleAuthority(source.sourcePath, row);
      const expectedSourceDigest = String(
        row.source_content_sha256 || row.sourceContentSha256 || ''
      ).toLowerCase();
      const actualSourceDigest = DocumentationPublicationAssembler.hashValue(
        readFileSync(source.absolutePath)
      );
      if (options.validateSourceHashes !== false && expectedSourceDigest !== actualSourceDigest) {
        throw new Error(
          `Documentation source input ${source.sourcePath} no longer matches Planning DB authority. Run \`pnpm docs:publish\` after refreshing the current DB state.`
        );
      }
      normalizedRows.push({
        canonicality: String(row.canonicality || ''),
        canonicalCounterpartCount: Number(
          row.canonical_counterpart_count ?? row.canonicalCounterpartCount ?? 0
        ),
        documentPath: source.sourcePath,
        duplicateCount: Number(row.duplicate_count ?? row.duplicateCount ?? 0),
        isDuplicate: row.is_duplicate === true || row.isDuplicate === true,
        lifecycleGapKind: String(row.lifecycle_gap_kind || row.lifecycleGapKind || 'none'),
        lifecycleState: String(row.lifecycle_state || row.lifecycleState || row.status || ''),
        sourceContentSha256: expectedSourceDigest,
      });
      if (this.policy.isPublishable(source.sourcePath, row)) publishableSources.push(source);
    }

    normalizedRows.sort((left, right) => left.documentPath.localeCompare(right.documentPath, 'en'));
    return {
      lifecycleByPath,
      lifecycleDigest: DocumentationPublicationAssembler.hashValue(JSON.stringify(normalizedRows)),
      publishableSources,
    };
  }

  copySource(source) {
    const destination = resolve(this.outputRoot, source.route);
    DocumentationPublicationPolicy.assertInside(
      this.outputRoot,
      destination,
      `Publication route ${source.route}`
    );
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source.absolutePath, destination);
  }

  static hashFiles(root) {
    const hash = createHash('sha256');
    const files = DocumentationPublicationPolicy.walkFiles(root).sort((left, right) =>
      left.localeCompare(right, 'en')
    );
    for (const absolutePath of files) {
      hash.update(DocumentationPublicationPolicy.toPosix(relative(root, absolutePath)));
      hash.update('\0');
      hash.update(readFileSync(absolutePath));
      hash.update('\0');
    }
    return hash.digest('hex');
  }

  async assemble(options = {}) {
    if (options.runGenerators !== false) {
      await this.run('pnpm planning:db:import --if-stale');
      for (const command of this.policy.generatorCommands()) {
        await this.run(command);
      }
    }

    const authoredSources = this.authoredMarkdownSources();
    const supportingSources = this.authoredSupportingSources();
    const generatedSources = this.policy.generatedSources();
    const lifecycleRows = await this.resolveLifecycleRows();
    const lifecycleState = this.buildLifecycleState(lifecycleRows, authoredSources);
    const routeOwners = new Map();
    for (const source of [...lifecycleState.publishableSources, ...generatedSources]) {
      const existing = routeOwners.get(source.route);
      if (existing) {
        throw new Error(
          `Duplicate publication route ${source.route}: ${existing.sourcePath} and ${source.sourcePath}.`
        );
      }
      routeOwners.set(source.route, source);
    }

    rmSync(this.outputRoot, { recursive: true, force: true });
    mkdirSync(this.outputRoot, { recursive: true });
    for (const source of [
      ...lifecycleState.publishableSources,
      ...supportingSources,
      ...generatedSources,
    ]) {
      this.copySource(source);
    }

    const navigableRoutes = [...routeOwners.values()]
      .filter((source) =>
        this.policy.isDefaultNavigationEntry(
          source,
          lifecycleState.lifecycleByPath.get(source.sourcePath)
        )
      )
      .map((source) => source.route)
      .sort((left, right) => {
        if (left === 'index.md') return -1;
        if (right === 'index.md') return 1;
        return left.localeCompare(right, 'en');
      });
    const canonicalConfig = loadYaml(readFileSync(this.canonicalConfigPath, 'utf8')) || {};
    const generatedConfig = {
      ...canonicalConfig,
      docs_dir: 'publication',
      nav: navigableRoutes,
    };
    mkdirSync(dirname(this.configPath), { recursive: true });
    writeFileSync(
      this.configPath,
      dumpYaml(generatedConfig, { lineWidth: 100, noRefs: true, sortKeys: false }),
      'utf8'
    );

    const treeDigest = DocumentationPublicationAssembler.hashFiles(this.outputRoot);
    const sourceDigest = DocumentationPublicationAssembler.hashSources([
      ...lifecycleState.publishableSources,
      ...supportingSources,
      ...generatedSources,
    ]);
    const receipt = {
      version: 2,
      commandRail: 'GeneratePlanningDerivedSurfaces',
      architectureQuery: 'ReadArchitectureDesignAuthority',
      consultationQuery: 'QueryDocumentationConsultationPath',
      lifecycleQuery: 'ListDocumentationLifecycleFacts',
      gitSha: this.currentGitSha(),
      sourceDigest,
      lifecycleDigest: lifecycleState.lifecycleDigest,
      policyInputDigest: DocumentationPublicationAssembler.hashValue(
        readFileSync(this.policy.policyPath)
      ),
      configurationInputDigest: DocumentationPublicationAssembler.hashValue(
        readFileSync(this.canonicalConfigPath)
      ),
      generatedConfigurationDigest: DocumentationPublicationAssembler.hashValue(
        readFileSync(this.configPath)
      ),
      routeCount: routeOwners.size,
      navigableRouteCount: navigableRoutes.length,
      treeDigest,
      publicationRoot: DocumentationPublicationPolicy.toPosix(
        relative(this.repoRoot, this.outputRoot)
      ),
      configPath: DocumentationPublicationPolicy.toPosix(relative(this.repoRoot, this.configPath)),
      routes: [...routeOwners.keys()].sort((left, right) => left.localeCompare(right, 'en')),
    };
    writeFileSync(this.manifestPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    return receipt;
  }

  async check() {
    if (
      !existsSync(this.outputRoot) ||
      !existsSync(this.configPath) ||
      !existsSync(this.manifestPath)
    ) {
      throw new Error(
        'Documentation publication is absent. Run `pnpm docs:publish` explicitly before serve or build.'
      );
    }
    const receipt = JSON.parse(readFileSync(this.manifestPath, 'utf8'));
    if (receipt.version !== 2) {
      throw new Error(
        'Documentation publication receipt version is obsolete. Run `pnpm docs:publish` explicitly.'
      );
    }
    const actualDigest = DocumentationPublicationAssembler.hashFiles(this.outputRoot);
    if (receipt.treeDigest !== actualDigest) {
      throw new Error(
        `Documentation publication digest mismatch: expected ${receipt.treeDigest}, received ${actualDigest}. Run \`pnpm docs:publish\` explicitly.`
      );
    }
    if (statSync(this.outputRoot).isDirectory() !== true) {
      throw new Error('Documentation publication root is not a directory.');
    }
    const policyInputDigest = DocumentationPublicationAssembler.hashValue(
      readFileSync(this.policy.policyPath)
    );
    if (receipt.policyInputDigest !== policyInputDigest) {
      throw new Error(
        'Documentation publication policy input changed. Run `pnpm docs:publish` explicitly.'
      );
    }
    const configurationInputDigest = DocumentationPublicationAssembler.hashValue(
      readFileSync(this.canonicalConfigPath)
    );
    if (receipt.configurationInputDigest !== configurationInputDigest) {
      throw new Error(
        'Documentation publication configuration input changed. Run `pnpm docs:publish` explicitly.'
      );
    }
    const gitSha = this.currentGitSha();
    if (receipt.gitSha !== gitSha) {
      throw new Error(
        'Documentation publication Git input changed. Run `pnpm docs:publish` explicitly.'
      );
    }
    const config = loadYaml(readFileSync(this.configPath, 'utf8')) || {};
    if (config.docs_dir !== 'publication') {
      throw new Error('Generated Zensical config must consume the disposable publication tree.');
    }
    const generatedConfigurationDigest = DocumentationPublicationAssembler.hashValue(
      readFileSync(this.configPath)
    );
    if (receipt.generatedConfigurationDigest !== generatedConfigurationDigest) {
      throw new Error(
        'Generated documentation configuration no longer matches its receipt. Run `pnpm docs:publish` explicitly.'
      );
    }

    const authoredSources = this.authoredMarkdownSources();
    const supportingSources = this.authoredSupportingSources();
    const generatedSources = this.policy.generatedSources();
    const lifecycleRows = await this.resolveLifecycleRows();
    const lifecycleState = this.buildLifecycleState(lifecycleRows, authoredSources, {
      validateSourceHashes: false,
    });
    if (receipt.lifecycleDigest !== lifecycleState.lifecycleDigest) {
      throw new Error(
        'Documentation publication lifecycle input changed. Run `pnpm docs:publish` explicitly.'
      );
    }
    const sourceDigest = DocumentationPublicationAssembler.hashSources([
      ...lifecycleState.publishableSources,
      ...supportingSources,
      ...generatedSources,
    ]);
    if (receipt.sourceDigest !== sourceDigest) {
      throw new Error(
        'Documentation publication source input changed. Run `pnpm docs:publish` explicitly.'
      );
    }
    this.buildLifecycleState(lifecycleRows, authoredSources);
    return receipt;
  }
}

async function runDocumentationPublicationCli(argv = process.argv.slice(2)) {
  const allowed = new Set(['--assemble', '--check']);
  for (const argument of argv) {
    if (!allowed.has(argument)) {
      throw new Error(`Unknown documentation publication option ${argument}.`);
    }
  }
  if (argv.length !== 1) {
    throw new Error('Choose exactly one of --assemble or --check.');
  }
  const assembler = new DocumentationPublicationAssembler();
  const receipt = argv.includes('--assemble')
    ? await assembler.assemble()
    : await assembler.check();
  console.log(
    `[docs:publication] ${argv.includes('--assemble') ? 'assembled' : 'valid'} routes=${receipt.routeCount} digest=${receipt.treeDigest}`
  );
  return receipt;
}

if (require.main === module) {
  runDocumentationPublicationCli().catch((error) => {
    console.error(`[docs:publication] ${error.message || error}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DocumentationPublicationAssembler,
  DocumentationPublicationPolicy,
  runDocumentationPublicationCli,
};
