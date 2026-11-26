/** Owned concern: apply documentary admission to current Git and native semantic authority. */
const {
  FeatureMechanizationGitDiffReader,
} = require('../../lib/feature-mechanization-git-diff.cjs');
const {
  createCurrentComponentFilesReadModelComponent,
} = require('./current-component-files-query.cjs');
const {
  documentaryKind,
  evaluateDocumentaryComponent,
  isDocumentaryRailDeclaration,
  documentaryRailReferencePaths,
} = require('../documentary-component.cjs');

async function readDocumentaryAssociations(client, ids, paths) {
  const [bindings, references, links] = await Promise.all([
    client.query(
      `select component_id, source_path, role
      from architecture.component_source_responsibility
      where component_id = any($1::text[]) or source_path = any($2::text[])`,
      [ids, paths]
    ),
    client.query(
      `select rail.rail_id, rail.implementation_refs, rail.allowed_implementation_surfaces
      from planning_query_store.command_query_rail_query rail
      where lower(rail.rail_status) not in ('retired', 'deprecated')`,
      []
    ),
    client.query(
      `select definition.component_id, document.value as document_path
      from planning_query_store.governance_component_definition_query definition
      join architecture.component semantic on semantic.component_id = definition.component_id
        and semantic.kind <> $2
      cross join lateral jsonb_array_elements_text(definition.governance_refs) document(value)
      where document.value = any($1::text[])`,
      [paths, documentaryKind]
    ),
  ]);
  return {
    bindings: bindings.rows,
    rails: references.rows,
    documentaryLinks: links.rows,
  };
}

function documentaryFindingRow(component, finding) {
  return {
    finding_kind: 'documentary_component_violation',
    severity: 'error',
    component_id: component.component_id,
    component_name: component.name || component.component_id,
    finding_state: 'fail',
    path: finding.path,
    related_component_id: null,
    relation_id: null,
    evidence_count: 0,
    action_hint: finding.message,
    source_view: 'ReadComponentFiles / native documentary authority',
    metadata: { code: finding.code, kind: documentaryKind },
  };
}

function createDocumentaryComponentReadModelComponent(deps = {}) {
  async function readDocumentaryIntegrityRows(client, options = {}) {
    const components =
      options.components ||
      (
        await client.query(
          'select component_id, name, kind, runtime, status from architecture.component where kind = $1',
          [documentaryKind]
        )
      ).rows;
    if (components.length === 0) return [];
    const reader = options.gitReader || deps.gitReader || new FeatureMechanizationGitDiffReader();
    const snapshot =
      options.snapshot ||
      (await createCurrentComponentFilesReadModelComponent({
        ...deps,
        gitReader: reader,
      }).readCurrentComponentOwnership(client));
    const ids = components.map((component) => component.component_id);
    const files = snapshot.files.filter(
      (file) =>
        ids.includes(file.component_unit) ||
        file.candidate_component_ids?.some((id) => ids.includes(id))
    );
    const associations = await readDocumentaryAssociations(
      client,
      ids,
      files.map((file) => file.path)
    );
    const ownedPaths = new Set(files.map((file) => file.path));
    const currentPaths = new Set(snapshot.files.map((file) => file.path));
    const declarationPaths = new Map(
      associations.rails.map((rail) => [rail, documentaryRailReferencePaths(rail)])
    );
    const relevant = (rail) =>
      declarationPaths.get(rail).some((filePath) => ownedPaths.has(filePath));
    const referencePaths = associations.rails
      .filter(relevant)
      .flatMap((rail) =>
        declarationPaths.get(rail).filter((filePath) => currentPaths.has(filePath))
      );
    reader.readSources([...new Set([...files.map((file) => file.path), ...referencePaths])]);
    const implementationRefs = associations.rails.flatMap((rail) =>
      relevant(rail) &&
      isDocumentaryRailDeclaration(rail, (filePath) =>
        currentPaths.has(filePath) ? reader.readSourceBytes(filePath) : null
      )
        ? []
        : (rail.implementation_refs || []).map((reference) =>
            typeof reference === 'string' ? { path: reference } : reference
          )
    );
    return components.flatMap((component) => {
      const unit = snapshot.units.find((unit) => unit.id === component.component_id);
      if (!unit) throw new Error('ARCH-DOCUMENTARY-AUTHORITY-MISSING: ' + component.component_id);
      return evaluateDocumentaryComponent({
        component,
        unit,
        files: files.filter(
          (file) =>
            file.component_unit === component.component_id ||
            file.candidate_component_ids?.includes(component.component_id)
        ),
        ...associations,
        implementationRefs,
        readBytes: (filePath) => reader.readSourceBytes(filePath),
      }).map((finding) => documentaryFindingRow(component, finding));
    });
  }

  async function assertDocumentaryComponentRecord(client, command, options = {}) {
    if (command.componentKind !== documentaryKind) return;
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [command.componentId]);
    const findings = await readDocumentaryIntegrityRows(client, {
      gitReader: options.gitReader,
      components: [
        {
          component_id: command.componentId,
          name: command.name,
          kind: command.componentKind,
          runtime: command.runtime,
          status: command.status,
        },
      ],
    });
    if (findings.length)
      throw new Error(
        'ARCH-DOCUMENTARY-OWNERSHIP-INVALID: ' +
          findings.map((row) => row.metadata.code + (row.path ? ': ' + row.path : '')).join('; ')
      );
  }

  return { readDocumentaryIntegrityRows, assertDocumentaryComponentRecord };
}

module.exports = {
  createDocumentaryComponentReadModelComponent,
  ...createDocumentaryComponentReadModelComponent(),
};
