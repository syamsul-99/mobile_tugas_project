/**
 * Konfigurasi lokasi terpusat. Semua angka jarak dalam meter, waktu dalam milidetik.
 */
export const EARTH_RADIUS_M = 6_371_000;

export const LOCATION_TIMEOUT_MS = 15_000;

/** Batas kecepatan (m/s) untuk memilih bucket interval. */
export const SPEED_THRESHOLDS = { walking: 1.4, vehicle: 8 } as const;

/**
 * Adaptive distanceInterval. `distanceInterval` adalah jarak perpindahan minimum
 * agar pembaruan dikirim, bukan interval waktu.
 * - Diam/melihat peta: 100 m, hemat baterai.
 * - Berjalan: 15 m, cukup halus untuk pergerakan lambat.
 * - Berkendara: 50 m, mengurangi pembaruan yang tidak perlu saat cepat.
 */
export const DISTANCE_INTERVALS = {
  stationary: 100,
  walking: 15,
  vehicle: 50,
} as const;

/** Nilai awal sebelum kecepatan diketahui. */
export const DEFAULT_DISTANCE_INTERVAL = DISTANCE_INTERVALS.stationary;

/** timeInterval hanya berlaku di Android sebagai batas waktu minimum antar pembaruan. */
export const TRACKING_TIME_INTERVAL_MS = 5_000;

export function distanceIntervalForSpeed(speed: number | null): number {
  const value = speed !== null && Number.isFinite(speed) && speed > 0 ? speed : 0;
  if (value < SPEED_THRESHOLDS.walking) return DISTANCE_INTERVALS.stationary;
  if (value < SPEED_THRESHOLDS.vehicle) return DISTANCE_INTERVALS.walking;
  return DISTANCE_INTERVALS.vehicle;
}

/** Pusat awal peta saat GPS belum tersedia (Bandung). Ditandai sebagai simulasi di UI. */
export const SIMULATION_REGION = {
  latitude: -6.9175,
  longitude: 107.6191,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
} as const;
