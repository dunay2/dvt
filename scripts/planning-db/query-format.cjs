function textValue(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

module.exports = {
  textValue,
};
