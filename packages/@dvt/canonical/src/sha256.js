'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sha256Hex = sha256Hex;
/**
 * @baseline ADR-0003
 */
const node_crypto_1 = require('node:crypto');
function sha256Hex(data) {
  const h = (0, node_crypto_1.createHash)('sha256');
  h.update(data);
  return h.digest('hex');
}
//# sourceMappingURL=sha256.js.map
