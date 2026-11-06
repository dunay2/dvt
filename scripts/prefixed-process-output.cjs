/** Owned concern: adapt a child output stream to prefixed console lines and a caller-owned reader. */
const readline = require('node:readline');

function pipePrefixedOutput(stream, prefix) {
  const lineReader = readline.createInterface({ input: stream });
  lineReader.on('line', (line) => {
    console.log(`${prefix} ${line}`);
  });
  return lineReader;
}

module.exports = { pipePrefixedOutput };
