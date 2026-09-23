export function normalizeAmountText(text: string): string {
  let normalized = text.replace(',', '.').replace(/[^0-9.]/g, '');

  const firstDot = normalized.indexOf('.');
  if (firstDot !== -1) {
    normalized = normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, '');
  }

  return normalized;
}

export function parseAmount(text: string): number {
  const value = parseFloat(normalizeAmountText(text));
  return Number.isFinite(value) ? value : NaN;
}

export function isValidAmount(text: string, min = 0.01): boolean {
  const value = parseAmount(text);
  return Number.isFinite(value) && value >= min;
}
