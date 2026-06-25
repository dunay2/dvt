function stripInlineCodeFragments(line) {
  return line.replace(/`[^`]*`/g, '');
}

module.exports = {
  stripInlineCodeFragments,
};
