export function normalizeIsbn(value: string): string | null {
  const tokens = value
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((v) => v.replace(/-/g, ''));
  const isbn13 = tokens.find(
    (v) =>
      /^97[89]\d{10}$/.test(v) &&
      [...v].reduce((sum, n, i) => sum + Number(n) * (i % 2 ? 3 : 1), 0) %
        10 ===
        0,
  );
  if (isbn13) return isbn13;
  const isbn10 = tokens.find(
    (v) =>
      /^\d{9}[\dX]$/.test(v) &&
      [...v].reduce(
        (sum, n, i) => sum + (n === 'X' ? 10 : Number(n)) * (10 - i),
        0,
      ) %
        11 ===
        0,
  );
  if (!isbn10) return null;
  const prefix = '978' + isbn10.slice(0, 9);
  const sum = [...prefix].reduce(
    (sum, n, i) => sum + Number(n) * (i % 2 ? 3 : 1),
    0,
  );
  return prefix + ((10 - (sum % 10)) % 10);
}
