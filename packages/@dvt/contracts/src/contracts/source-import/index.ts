/**
 * Owned concern: expose the source-import contract component through one
 * narrow semantic barrel.
 *
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Re-export only source-object catalog and source-import operation contracts from this barrel.
 * @consequence Consumers receive one governed source-import vocabulary without unrelated contract leakage.
 * @version 1.0.0
 */
export * from './SourceObjectCatalog.v1.js';
export * from './SourceImportOperations.v1.js';
export * from './SourceImportOperations.v2.js';
export * from './SourceRebindOperations.v1.js';
export * from './ConnectedSourceRef.v1.js';
export * from './SourceDataSample.v1.js';
