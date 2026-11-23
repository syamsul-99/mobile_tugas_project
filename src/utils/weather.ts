/** Label singkat untuk kode cuaca WMO yang dipakai Open-Meteo. */
export function weatherLabel(code: number | null): string {
  if (code === null) return '—';
  if (code === 0) return 'Cerah';
  if (code === 1) return 'Cerah berawan';
  if (code === 2) return 'Sebagian berawan';
  if (code === 3) return 'Berawan';
  if (code === 45 || code === 48) return 'Berkabut';
  if (code >= 51 && code <= 57) return 'Gerimis';
  if (code >= 61 && code <= 65) return 'Hujan';
  if (code === 66 || code === 67) return 'Hujan beku';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Salju';
  if (code >= 80 && code <= 82) return 'Hujan lokal';
  if (code >= 95) return 'Badai petir';
  return '—';
}
