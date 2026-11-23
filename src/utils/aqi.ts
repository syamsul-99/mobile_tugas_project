import { colors } from '@/constants/design';
import type { AqiCategory } from '@/types/air';

/**
 * Kategori US AQI sesuai breakpoint EPA (0-50, 51-100, 101-150, 151-200,
 * 201-300, >300). Nilai `us_aqi` berasal langsung dari Open-Meteo.
 */
export function categorizeAqi(value: number | null): AqiCategory | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  if (value <= 50) return 'good';
  if (value <= 100) return 'moderate';
  if (value <= 150) return 'usg';
  if (value <= 200) return 'unhealthy';
  if (value <= 300) return 'veryUnhealthy';
  return 'hazardous';
}

export const AQI_LABEL: Record<AqiCategory, string> = {
  good: 'Baik',
  moderate: 'Sedang',
  usg: 'Tidak sehat untuk kelompok sensitif',
  unhealthy: 'Tidak sehat',
  veryUnhealthy: 'Sangat tidak sehat',
  hazardous: 'Berbahaya',
};

export const AQI_COLOR: Record<AqiCategory, string> = {
  good: colors.good,
  moderate: colors.moderate,
  usg: colors.usg,
  unhealthy: colors.unhealthy,
  veryUnhealthy: colors.veryUnhealthy,
  hazardous: colors.hazardous,
};
