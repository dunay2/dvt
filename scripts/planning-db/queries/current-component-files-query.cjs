/**
 * @file scripts/planning-db/queries/current-component-files-query.cjs
 * @ownedConcern Resolve current Git files against effective Planning DB ownership.
 * @baseline ADR-0061: Planning DB owns component definitions; Git owns physical inventory.
 * @decision Share one read-only ownership snapshot across file and component-profile queries.
 * @consequence Missing or ambiguous ownership stays visible without importing stale projections.
 * @version 1.0.0
 */
const { buildOwnerMatcher } = require('../../check-governance-unit-coverage.cjs');
const { deriveGovernanceSemantics } = require('../../generate-governance-file-component-index.cjs');
const {
  FeatureMechanizationGitDiffReader,
} = require('../../lib/feature-mechanization-git-diff.cjs');
const { schemaName } = require('../../planning-db-schema.cjs');
const { parseLimit } = require('../query-limit.cjs');
const {
  readSourceResponsibilityAuthority,
} = require('../component-source-responsibility-store.cjs');
const {
  validateResponsibilityBindings,
  validateSourceResponsibilityReferences,
} = require('../../lib/component-source-responsibilities.cjs');

function createCurrentComponentFilesReadModelComponent(deps = {}) {
  const compareText = (left, right) => (left === right ? 0 : left < right ? -1 : 1);

  function readGitSourceInventory(
    reader = deps.gitReader || new FeatureMechanizationGitDiffReader()
  ) {
    reader.resolveComparison();
    return [...new Set(reader.readCurrentFiles())].sort(compareText);
  }

  function list(value, field, id) {
    if (value === null || value === undefined) return [];
    if (
      !Array.isArray(value) ||
      value.some((entry) => typeof entry !== 'string' || !entry.trim())
    ) {
      throw new Error(`CURRENT-COMPONENT-AUTHORITY: Invalid ${field} for ${id}.`);
    }
    return [...value];
  }

  function normalizeUnits(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('CURRENT-COMPONENT-AUTHORITY: Planning DB returned no unit authority.');
    }
    const units = rows.map((row) => {
      if (typeof row.id !== 'string' || !row.id.trim()) {
        throw new Error('CURRENT-COMPONENT-AUTHORITY: Unit identity is missing.');
      }
      return {
        ...row,
        parent: row.parent ?? null,
        owns: list(row.owns, 'owns', row.id),
        excludes: list(row.excludes, 'excludes', row.id),
        responsibilities: list(row.responsibilities, 'responsibilities', row.id),
      };
    });
    const byId = new Map(units.map((unit) => [unit.id, unit]));
    if (byId.size !== units.length) {
      throw new Error('CURRENT-COMPONENT-AUTHORITY: Duplicate unit identity.');
    }
    for (const unit of units) {
      const ancestors = [];
      const visited = new Set();
      let current = unit;
      while (current) {
        if (visited.has(current.id)) {
          throw new Error(`CURRENT-COMPONENT-AUTHORITY: Cyclic parent chain for ${unit.id}.`);
        }
        visited.add(current.id);
        ancestors.push(current.id);
        if (current.parent !== null && !byId.has(current.parent)) {
          throw new Error(
            `CURRENT-COMPONENT-AUTHORITY: Missing parent ${current.parent} for ${current.id}.`
          );
        }
        current = current.parent === null ? null : byId.get(current.parent);
      }
      unit.unit_path = ancestors.reverse();
    }
    return units.sort((left, right) => compareText(left.id, right.id));
  }

  function resolveFile(filePath, matches, byId) {
    const owners = matches.filter(
      (candidate) =>
        !matches.some(
          (other) => other.id !== candidate.id && other.unit_path.includes(candidate.id)
        )
    );
    if (owners.length !== 1) {
      const ambiguous = owners.length > 1;
      return {
        path: filePath,
        component_unit: ambiguous ? 'AMBIGUOUS' : 'UNOWNED',
        owning_unit: ambiguous ? 'AMBIGUOUS' : 'UNOWNED',
        root_unit: null,
        domain_unit: null,
        governance_state: ambiguous ? 'ambiguous' : 'unowned',
        is_drift: true,
        is_legacy: false,
        ddd_owner: null,
        cq_rails: null,
        unit_path: [],
        owned_concern: null,
        responsibilities: [],
        candidate_component_ids: owners.map((owner) => owner.id).sort(compareText),
        candidate_unit_paths: owners.map((owner) => [...owner.unit_path]),
      };
    }
    const owner = owners[0];
    const ancestors = owner.unit_path.map((id) => byId.get(id));
    const component = [...ancestors].reverse().find((unit) => unit.level === 'component');
    return {
      path: filePath,
      component_unit: component?.id || owner.id,
      owning_unit: owner.id,
      root_unit: owner.root_unit || ancestors.find((unit) => unit.level === 'system')?.id || null,
      domain_unit:
        owner.domain_unit || ancestors.find((unit) => unit.level === 'domain')?.id || null,
      governance_state: deriveGovernanceSemantics(owner.status, owner.level).governanceState,
      is_drift: owner.status === 'drift',
      is_legacy: owner.status === 'legacy',
      ddd_owner: owner.ddd_owner ?? null,
      cq_rails: owner.cq_rails ?? null,
      unit_path: [...owner.unit_path],
      owned_concern: owner.owned_concern ?? null,
      responsibilities: [...owner.responsibilities],
    };
  }

  function buildCurrentComponentTree(units, files) {
    const byId = new Map(units.map((unit) => [unit.id, unit]));
    const rows = new Map(
      units.map((unit) => {
        const ancestors = unit.unit_path.map((id) => byId.get(id));
        return [
          unit.id,
          {
            component_id: unit.id,
            name: unit.name,
            component_level: unit.level,
            parent_component_id: unit.parent,
            root_unit:
              unit.root_unit ||
              ancestors.find((ancestor) => ancestor.level === 'system')?.id ||
              null,
            domain_unit:
              unit.domain_unit ||
              ancestors.find((ancestor) => ancestor.level === 'domain')?.id ||
              null,
            status: unit.status,
            governance_state: deriveGovernanceSemantics(unit.status, unit.level).governanceState,
            children_required: unit.children_required,
            ddd_owner: unit.ddd_owner,
            cq_rails: unit.cq_rails,
            is_materialized_component: unit.level === 'component',
            has_children: false,
            is_leaf_component: true,
            direct_file_count: 0,
            descendant_component_count: 0,
            descendant_file_count: 0,
            ambiguous_file_count: 0,
            test_file_count: 0,
          },
        ];
      })
    );
    for (const unit of units) {
      if (unit.parent) {
        rows.get(unit.parent).has_children = true;
        rows.get(unit.parent).is_leaf_component = false;
      }
      for (const id of unit.unit_path.slice(0, -1)) rows.get(id).descendant_component_count++;
    }
    for (const file of files) {
      const owner = rows.get(file.owning_unit);
      if (owner) owner.direct_file_count++;
      const affected = new Set([...file.unit_path, ...(file.candidate_unit_paths || []).flat()]);
      for (const id of affected) {
        const row = rows.get(id);
        row.descendant_file_count++;
        if (file.governance_state === 'ambiguous') row.ambiguous_file_count++;
        if (/(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/.test(file.path))
          row.test_file_count++;
      }
    }
    return [...rows.values()];
  }

  async function readCurrentComponentFiles(client) {
    const reader = deps.gitReader || new FeatureMechanizationGitDiffReader();
    const currentFiles = readGitSourceInventory(reader);
    const result = await client.query(`
      select
        definition.unit_id as id,
        definition.name,
        definition.parent_id as parent,
        definition.level,
        definition.root_unit,
        definition.domain_unit,
        coalesce(component.status, definition.status) as status,
        coalesce(component.children_required, definition.children_required) as children_required,
        component.owns,
        component.excludes,
        component.owned_concern,
        component.responsibilities,
        coalesce(component.ddd_owner, definition.ddd_owner) as ddd_owner,
        coalesce(component.cq_rails, definition.cq_rails) as cq_rails,
        component.definition_source
      from ${schemaName}.governance_unit_query definition
      left join ${schemaName}.governance_component_definition_query component
        on component.component_id = definition.unit_id
      order by definition.unit_id
    `);
    const units = normalizeUnits(result.rows);
    const byId = new Map(units.map((unit) => [unit.id, unit]));
    const matchOwners = buildOwnerMatcher(units.filter((unit) => unit.status !== 'superseded'));
    const files = currentFiles
      .map((filePath) => resolveFile(filePath, matchOwners(filePath), byId))
      .sort(
        (left, right) =>
          Number(right.is_drift) - Number(left.is_drift) ||
          compareText(left.component_unit, right.component_unit) ||
          compareText(left.path, right.path)
      );
    const authority = await readSourceResponsibilityAuthority(client);
    const shape = validateResponsibilityBindings(
      authority.map(({ responsibilityId, componentId, path, symbol, role, testPaths }) => ({
        responsibilityId,
        componentId,
        path,
        symbol,
        role,
        testPaths,
      }))
    );
    if (shape.errors.length)
      throw new Error('Invalid source responsibility authority: ' + shape.errors.join('; '));
    const responsibilities = authority.map((row) => ({
      responsibilityId: row.responsibilityId,
      componentId: row.responsibilityComponentId,
      description: row.description,
    }));
    const paths = new Set(currentFiles);
    const errors = [];
    const byPath = new Map();
    for (const binding of shape.bindings) {
      if (!byPath.has(binding.path)) byPath.set(binding.path, []);
      byPath.get(binding.path).push(binding);
      if (!paths.has(binding.path))
        errors.push('Missing mandatory responsibility source: ' + binding.path);
    }
    for (const row of authority)
      if (!['approved', 'implemented'].includes(row.status))
        errors.push(
          'Noncanonical responsibility status ' + row.status + ': ' + row.responsibilityId
        );
    for (const file of files) {
      const bindings = byPath.get(file.path) || [];
      file.responsibility_bindings = bindings.map((binding) => ({
        ...binding,
        description: responsibilities.find(
          (row) => row.responsibilityId === binding.responsibilityId
        )?.description,
      }));
      file.responsibility_errors =
        bindings.length === 0
          ? []
          : validateSourceResponsibilityReferences({
              path: file.path,
              content: reader.readSource(file.path),
              bindings,
              ownerComponentId: file.component_unit,
              responsibilities,
              currentPaths: paths,
            }).errors;
      errors.push(...file.responsibility_errors.map((error) => file.path + ': ' + error));
    }
    return {
      files,
      units,
      errors,
      bindings: shape.bindings,
      tree: buildCurrentComponentTree(units, files),
    };
  }

  return { readCurrentComponentFiles, readGitSourceInventory };
}

function selectCurrentComponentTreeRows(snapshot, filters = {}) {
  const fields = {
    component: 'component_id',
    parentUnit: 'parent_component_id',
    governanceState: 'governance_state',
    rootUnit: 'root_unit',
    domainUnit: 'domain_unit',
  };
  return snapshot.tree
    .filter((row) =>
      Object.entries(fields).every(
        ([filter, field]) =>
          filters[filter] === undefined ||
          filters[filter] === null ||
          filters[filter] === '' ||
          row[field] === filters[filter]
      )
    )
    .slice(0, parseLimit(filters.limit, 50));
}

module.exports = {
  createCurrentComponentFilesReadModelComponent,
  selectCurrentComponentTreeRows,
  ...createCurrentComponentFilesReadModelComponent(),
};
