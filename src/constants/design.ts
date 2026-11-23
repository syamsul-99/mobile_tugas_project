/**
 * Token visual UdaraWaspada. Satu aksen, warna status hanya untuk status.
 * Sengaja terpisah dari `theme.ts` (milik template) agar tema lama tidak rusak
 * sebelum kode template dibersihkan.
 */
export const colors = {
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  line: '#E3E6EB',
  ink: '#12161C',
  inkMuted: '#5A6472',
  inkFaint: '#8B94A3',
  accent: '#1B4D8F',
  accentSoft: '#E8EEF7',
  good: '#2E7D5B',
  moderate: '#A9770A',
  usg: '#C2621B',
  unhealthy: '#B3261E',
  veryUnhealthy: '#6E3B8A',
  hazardous: '#5A2A22',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
