export type AqiCategory =
  | 'good'
  | 'moderate'
  | 'usg'
  | 'unhealthy'
  | 'veryUnhealthy'
  | 'hazardous';

export interface Coords {
  lat: number;
  lon: number;
}

export interface HourPoint {
  /** Waktu lokal dari API, format `YYYY-MM-DDTHH:mm`. */
  time: string;
  value: number | null;
}

export interface AirReading {
  aqiUs: number | null;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
  so2: number | null;
  co: number | null;
  dust: number | null;
  aod: number | null;
  observedAt: string;
  timezone: string;
  hourlyAqi: HourPoint[];
}

export interface RainReading {
  /** Curah hujan jam berjalan (mm). */
  currentMm: number | null;
  /** Suhu udara jam berjalan (°C). */
  temperatureC: number | null;
  /** Peluang hujan jam berjalan (%). */
  probability: number | null;
  hourly: HourPoint[];
  hourlyProbability: HourPoint[];
  hourlyTemperature: HourPoint[];
  /** Kode cuaca WMO per jam (lihat `weatherLabel`). */
  hourlyCode: HourPoint[];
}

/** Satu snapshot gabungan, disimpan sebagai cache nanti. */
export interface Snapshot {
  coords: Coords;
  reading: AirReading;
  rain: RainReading;
  fetchedAt: number;
}
