/**
 * Paleta categórica validada (skill dataviz, references/palette.md).
 * Orden fijo — nunca se reordena ni se cicla; valida CVD + separación
 * normal-vision contra superficie blanca (ver validate_palette.js).
 */
export const CATEGORICAL_PALETTE = [
  '#2a78d6', // 1 azul
  '#eb6834', // 2 naranja
  '#1baf7a', // 3 aqua
  '#eda100', // 4 amarillo
  '#e87ba4', // 5 magenta
  '#008300', // 6 verde
  '#4a3aa7', // 7 violeta
  '#e34948', // 8 rojo
] as const;

// Tonos que caen bajo 3:1 de contraste contra fondo blanco (aqua, amarillo,
// magenta) — por regla del skill, SIEMPRE van con etiqueta visible, nunca
// solo color.
export const LOW_CONTRAST_SLOTS = new Set([2, 3, 4]);

export const SEQUENTIAL_BLUE = '#2a78d6';

export const CHART_INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
};

export function colorForIndex(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]!;
}
