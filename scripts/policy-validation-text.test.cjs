const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripInlineCodeFragments } = require('./policy-validation-text.cjs');

test('stripInlineCodeFragments removes inline Markdown code fragments', () => {
  assert.equal(
    stripInlineCodeFragments('This MUST keep prose but ignore `must` in code.'),
    'This MUST keep prose but ignore  in code.'
  );
});

test('policy validators import the shared inline-code stripper', () => {
  const consumers = ['validate-references.cjs', 'validate-rfc2119.cjs'];

  for (const consumer of consumers) {
    const source = fs.readFileSync(path.join(__dirname, consumer), 'utf8');
    assert.match(source, /stripInlineCodeFragments/);
    assert.doesNotMatch(source, /function\s+(stripInlineCode|sanitizeLine)\b/);
  }
});
