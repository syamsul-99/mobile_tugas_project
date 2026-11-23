export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Validasi koordinat: harus angka finite dan berada pada rentang geografis. */
export function isValidCoordinate({ lat, lon }: LatLon): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Jarak great-circle (garis lurus di permukaan bumi) memakai rumus Haversine.
 * Mengembalikan null untuk koordinat tidak valid, sehingga tidak pernah NaN.
 * Ini bukan jarak tempuh melalui jalan raya.
 */
export function haversineMeters(a: LatLon, b: LatLon): number | null {
  if (!isValidCoordinate(a) || !isValidCoordinate(b)) return null;

  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dPhi = toRad(b.lat - a.lat);
  const dLambda = toRad(b.lon - a.lon);

  const sinLat = Math.sin(dPhi / 2);
  const sinLon = Math.sin(dLambda / 2);
  const h = sinLat * sinLat + Math.cos(phi1) * Math.cos(phi2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));

  const distance = EARTH_RADIUS_M * c;
  return Number.isFinite(distance) ? distance : null;
}

export function haversineKm(a: LatLon, b: LatLon): number | null {
  const meters = haversineMeters(a, b);
  return meters === null ? null : meters / 1000;
}

/** Format tampilan: "820 m" atau "1,4 km". */
export function formatDistance(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
