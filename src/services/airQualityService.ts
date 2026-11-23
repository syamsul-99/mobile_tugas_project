import type { Coords, HourPoint, Snapshot } from '@/types/air';

/**
 * Sumber data: Open-Meteo (tanpa API key). Data bersifat model/reanalysis,
 * bukan hasil sensor di titik pengguna.
 */
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(readonly kind: 'network' | 'timeout' | 'http' | 'parse', message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new ApiError('http', `Permintaan gagal (${res.status}).`);
    return await res.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError('timeout', 'Permintaan melewati batas waktu.');
    }
    throw new ApiError('network', 'Tidak dapat menghubungi server data.');
  } finally {
    clearTimeout(timer);
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function toHourly(times: unknown, values: unknown): HourPoint[] {
  if (!Array.isArray(times) || !Array.isArray(values)) {
    throw new ApiError('parse', 'Format data prakiraan tidak dikenali.');
  }
  return times.map((t, i) => ({ time: str(t), value: num(values[i]) }));
}

type Json = Record<string, any>;

export async function fetchSnapshot({ lat, lon }: Coords): Promise<Snapshot> {
  const q = `latitude=${lat}&longitude=${lon}&timezone=auto`;
  const [airRaw, weatherRaw] = await Promise.all([
    getJson(
      `${AIR_URL}?${q}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,dust,aerosol_optical_depth` +
        `&hourly=us_aqi,pm2_5,pm10&past_days=0&forecast_days=2`,
    ),
    getJson(
      `${WEATHER_URL}?${q}&current=temperature_2m,precipitation,weather_code` +
        `&hourly=temperature_2m,precipitation,precipitation_probability,weather_code&forecast_days=2`,
    ),
  ]);

  const air = airRaw as Json;
  const weather = weatherRaw as Json;
  const airCurrent = air?.current as Json | undefined;
  const airHourly = air?.hourly as Json | undefined;
  const weatherCurrent = weather?.current as Json | undefined;
  const weatherHourly = weather?.hourly as Json | undefined;

  if (!airCurrent || !airHourly || !weatherCurrent || !weatherHourly) {
    throw new ApiError('parse', 'Respons API tidak berisi data yang dibutuhkan.');
  }

  const observedAt = str(airCurrent.time);

  const rainProbability = toHourly(
    weatherHourly.time,
    weatherHourly.precipitation_probability,
  );

  return {
    coords: { lat, lon },
    fetchedAt: Date.now(),
    reading: {
      aqiUs: num(airCurrent.us_aqi),
      pm25: num(airCurrent.pm2_5),
      pm10: num(airCurrent.pm10),
      o3: num(airCurrent.ozone),
      no2: num(airCurrent.nitrogen_dioxide),
      so2: num(airCurrent.sulphur_dioxide),
      co: num(airCurrent.carbon_monoxide),
      dust: num(airCurrent.dust),
      aod: num(airCurrent.aerosol_optical_depth),
      observedAt,
      timezone: str(air.timezone),
      hourlyAqi: toHourly(airHourly.time, airHourly.us_aqi),
    },
    rain: {
      currentMm: num(weatherCurrent.precipitation),
      temperatureC: num(weatherCurrent.temperature_2m),
      probability: rainProbability.find((p) => p.time.slice(0, 13) === str(weatherCurrent.time).slice(0, 13))?.value ?? null,
      hourly: toHourly(weatherHourly.time, weatherHourly.precipitation),
      hourlyProbability: rainProbability,
      hourlyTemperature: toHourly(weatherHourly.time, weatherHourly.temperature_2m),
      hourlyCode: toHourly(weatherHourly.time, weatherHourly.weather_code),
    },
  };
}

/** Data dianggap kedaluwarsa bila snapshot lebih tua dari ambang ini. */
export const STALE_AFTER_MS = 60 * 60 * 1000;

export function isStale(snapshot: Snapshot, now = Date.now()): boolean {
  return now - snapshot.fetchedAt > STALE_AFTER_MS;
}

/** Ambil jendela `count` jam mulai dari jam observasi (inklusif). */
export function windowFrom(hourly: HourPoint[], startTime: string, count: number): HourPoint[] {
  const hour = startTime.slice(0, 13);
  const start = hourly.findIndex((p) => p.time.slice(0, 13) === hour);
  const from = start >= 0 ? start : 0;
  return hourly.slice(from, from + count);
}

export function peakOf(hourly: HourPoint[]): HourPoint | null {
  return hourly.reduce<HourPoint | null>(
    (best, p) => (p.value !== null && (!best || (best.value ?? -1) < p.value) ? p : best),
    null,
  );
}

/** `2026-11-11T14:00` -> `14:00`. Tanpa Intl agar tidak bergantung timezone perangkat. */
export function hourLabel(time: string): string {
  return time.slice(11, 16);
}
