'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PlanIntegrityValidator = void 0;
const sha256_js_1 = require('../utils/sha256.js');
class PlanIntegrityValidator {
  async fetchAndValidate(planRef, fetcher) {
    const bytes = await fetcher.fetch(planRef);
    const actual = (0, sha256_js_1.sha256Hex)(bytes);
    if (actual !== planRef.sha256) {
      const err = new Error(
        `PLAN_INTEGRITY_VALIDATION_FAILED: expected=${planRef.sha256} actual=${actual}`
      );
      // In real impl: emit P1 alert + audit log.
      throw err;
    }
    return bytes;
  }
}
exports.PlanIntegrityValidator = PlanIntegrityValidator;
//# sourceMappingURL=planIntegrity.js.map
