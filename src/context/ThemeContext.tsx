import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface AccentPalette {
  key: string;
  label: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryRgb: string;
}

/**
 * Paletas de acento preestablecidas. Solo cambian el color "de marca"
 * (botones primarios, nav activo, tarjeta principal del inicio, etc.);
 * los colores semánticos (éxito, peligro, advertencia) se mantienen fijos
 * porque son significado, no identidad visual.
 */
export const ACCENT_PALETTES: AccentPalette[] = [
  { key: 'purple', label: 'Morado', primary: '#5B5FEF', primaryDark: '#4347C4', primarySoft: '#EDEEFD', primaryRgb: '91, 95, 239' },
  { key: 'blue', label: 'Azul', primary: '#2F80ED', primaryDark: '#1D5FC4', primarySoft: '#E6F0FD', primaryRgb: '47, 128, 237' },
  { key: 'green', label: 'Verde', primary: '#16A87A', primaryDark: '#0F8561', primarySoft: '#E1F7EF', primaryRgb: '22, 168, 122' },
  { key: 'pink', label: 'Rosa', primary: '#E0559E', primaryDark: '#B93E80', primarySoft: '#FCE8F2', primaryRgb: '224, 85, 158' },
  { key: 'orange', label: 'Naranja', primary: '#E8791E', primaryDark: '#BE5F12', primarySoft: '#FDECDC', primaryRgb: '232, 121, 30' },
  { key: 'graphite', label: 'Grafito', primary: '#33394A', primaryDark: '#1F2330', primarySoft: '#E7E8EC', primaryRgb: '51, 57, 74' },
];

const STORAGE_KEY = 'finanzas_accent_color';

interface ThemeContextValue {
  accent: AccentPalette;
  palettes: AccentPalette[];
  setAccentKey: (key: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyAccent(accent: AccentPalette) {
  const root = document.documentElement.style;
  root.setProperty('--primary', accent.primary);
  root.setProperty('--primary-dark', accent.primaryDark);
  root.setProperty('--primary-soft', accent.primarySoft);
  root.setProperty('--primary-rgb', accent.primaryRgb);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentKey, setAccentKeyState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && ACCENT_PALETTES.some((p) => p.key === saved) ? saved : ACCENT_PALETTES[0].key;
  });

  const accent = useMemo(() => ACCENT_PALETTES.find((p) => p.key === accentKey) ?? ACCENT_PALETTES[0], [accentKey]);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  function setAccentKey(key: string) {
    setAccentKeyState(key);
    localStorage.setItem(STORAGE_KEY, key);
  }

  const value = useMemo<ThemeContextValue>(() => ({ accent, palettes: ACCENT_PALETTES, setAccentKey }), [accent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
