// Match Unicode characters, rather than UTF-16 code units. Never evaluate IME pre-edit text.
export function comparePractice(target, value) {
  const expected = Array.from(target.normalize("NFC"));
  const actual = Array.from(value.normalize("NFC"));
  const correct = actual.reduce((count, char, index) => count + Number(char === expected[index]), 0);
  return {
    expected,
    actual,
    correct,
    errors: actual.length - correct,
    complete: actual.length === expected.length && correct === expected.length,
    progress: expected.length ? Math.min(100, Math.round((correct / expected.length) * 100)) : 0,
  };
}
