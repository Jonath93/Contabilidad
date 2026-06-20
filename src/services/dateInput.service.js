function parseLatinDate(value) {
  if (!value) return new Date();

  const trimmed = value.trim();
  const latinMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (latinMatch) {
    const day = Number(latinMatch[1]);
    const month = Number(latinMatch[2]);
    const year = Number(latinMatch[3]);
    return new Date(year, month - 1, day);
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return new Date(year, month - 1, day);
  }

  return new Date(trimmed);
}

module.exports = {
  parseLatinDate
};
