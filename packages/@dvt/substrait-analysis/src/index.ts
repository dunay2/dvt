export { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
export {
  indexSubstraitRelations,
  type SubstraitRelationIndex,
  type IndexedRelation,
  type RelationIndexResult,
} from './relationIndex.js';
export { readRelationStructure } from './relationStructure.js';
export { selectDvtSubstraitRelation } from './relationSelection.js';
export { deriveSubstraitSchemas, type SubstraitSchemas } from './relationSchema.js';
export { isSchemaTypeNullable, type SchemaField } from './schemaTypes.js';
export { deriveExpressionSchema } from './schemaExpression.js';
export { RelationAnalysisSession, type RelationAnalysisResult } from './relationAnalysisSession.js';
export { MemoryRelationAnalysisCache } from './memoryAnalysisCache.js';
export type {
  RelationAnalysisCache,
  RelationAnalysisCacheEntry,
  RelationAnalysisCacheFailure,
} from './analysisCache.js';
export type { RelationChangeSet } from './relationChangeSet.js';
