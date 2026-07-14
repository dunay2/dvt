/**
 * Owned concern: expose the dbt project import contract component.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Re-export only the versioned dbt project import published language
 * from this barrel.
 * @consequence Consumers cannot bypass the governed validation receipt and
 * import command vocabulary.
 * @version 1.0.0
 */
export * from './DbtProjectImport.v1.js';
