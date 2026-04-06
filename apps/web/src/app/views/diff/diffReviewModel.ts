import type { DbtNode, DiffChange } from '../../types/dbt';
import type { FileContent } from '../../ports/workspace';

export type SqlDiffDocument = {
  currentLabel: string;
  currentSql: string;
  previousLabel: string;
  previousSql: string;
  title: string;
};

export type CatalogDiffDocument = {
  currentCatalogJson: string;
  previousCatalogJson: string;
};

function normalizeSql(sql: string): string {
  return sql.replace(/\r\n/g, '\n').trim();
}

function insertRemovedColumn(sql: string, columnName: string): string {
  const lines = sql.split('\n');
  const fromIndex = lines.findIndex((line) => line.trim().startsWith('FROM '));
  if (fromIndex <= 0) {
    return sql;
  }

  const indentMatch = lines[fromIndex - 1]?.match(/^\s*/);
  const indent = indentMatch?.[0] ?? '  ';
  const insertionIndex = Math.max(1, fromIndex - 1);
  lines.splice(insertionIndex, 0, `${indent}${columnName},`);
  return lines.join('\n');
}

function revertSqlChanges(currentSql: string, nodeChanges: DiffChange[]): string {
  let previousSql = currentSql;

  for (const change of nodeChanges) {
    if (
      change.oldValue === 'No filter' &&
      typeof change.newValue === 'string' &&
      previousSql.includes(change.newValue)
    ) {
      previousSql = previousSql.replace(`\n${change.newValue}`, '');
      continue;
    }

    if (
      change.newValue == null &&
      typeof change.oldValue === 'string' &&
      change.oldValue.includes(' ')
    ) {
      const [columnName] = change.oldValue.split(' ');
      if (columnName) {
        previousSql = insertRemovedColumn(previousSql, columnName);
      }
    }
  }

  return normalizeSql(previousSql);
}

function buildCatalogNode(node: DbtNode) {
  return {
    metadata: {
      name: node.name,
      path: node.path,
      type: node.type,
    },
    columns: Object.fromEntries(
      (node.columns ?? []).map((column, index) => [
        column.name,
        {
          type: column.type,
          nullable: column.nullable,
          index: index + 1,
        },
      ])
    ) as Record<string, { type: string; nullable: boolean; index: number }>,
  };
}

function revertCatalogNode(node: DbtNode, nodeChanges: DiffChange[]) {
  const previousNode = buildCatalogNode(node);

  for (const change of nodeChanges) {
    if (
      typeof change.oldValue === 'string' &&
      typeof change.newValue === 'string' &&
      change.description.includes('Column type changed:')
    ) {
      const columnName = change.description
        .replace('Column type changed:', '')
        .trim()
        .split(' ')[0];
      if (columnName && previousNode.columns[columnName]) {
        previousNode.columns[columnName].type = change.oldValue;
      }
      continue;
    }

    if (change.newValue == null && typeof change.oldValue === 'string') {
      const [columnName, columnType] = change.oldValue.split(' ');
      if (columnName && !previousNode.columns[columnName]) {
        previousNode.columns[columnName] = {
          type: columnType ?? 'UNKNOWN',
          nullable: true,
          index: Object.keys(previousNode.columns).length + 1,
        };
      }
    }
  }

  return previousNode;
}

export function selectPrimaryDiffNode(
  diffChanges: DiffChange[],
  graphNodes: DbtNode[]
): DbtNode | null {
  for (const change of diffChanges) {
    const match = graphNodes.find(
      (node) => node.id === change.nodeId || node.name === change.nodeId
    );
    if (match) {
      return match;
    }
  }

  return null;
}

export function buildSqlDiffDocument(
  node: DbtNode | null,
  nodeChanges: DiffChange[],
  fileContent: FileContent | null
): SqlDiffDocument {
  if (!node) {
    return {
      currentLabel: 'Current workspace',
      currentSql: '',
      previousLabel: 'Previous revision',
      previousSql: '',
      title: 'Compiled SQL Diff',
    };
  }

  const currentSql = normalizeSql(fileContent?.content ?? node.compiledSql ?? '');
  const previousSql = revertSqlChanges(currentSql, nodeChanges);

  return {
    currentLabel: `${node.path} (current)`,
    currentSql,
    previousLabel: `${node.name} (previous)`,
    previousSql,
    title: `Compiled SQL Diff: ${node.name}`,
  };
}

export function buildCatalogDiffDocument(
  node: DbtNode | null,
  nodeChanges: DiffChange[]
): CatalogDiffDocument {
  if (!node) {
    return {
      currentCatalogJson: '{}',
      previousCatalogJson: '{}',
    };
  }

  const currentCatalog = {
    nodes: {
      [node.id]: buildCatalogNode(node),
    },
  };
  const previousCatalog = {
    nodes: {
      [node.id]: revertCatalogNode(node, nodeChanges),
    },
  };

  return {
    currentCatalogJson: JSON.stringify(currentCatalog, null, 2),
    previousCatalogJson: JSON.stringify(previousCatalog, null, 2),
  };
}
