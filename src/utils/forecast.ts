import type { HourPoint, RainReading } from '@/types/air';

export interface ForecastRow {
  time: string;
  temperature: number | null;
  mm: number | null;
  probability: number | null;
  code: number | null;
}

/** Gabungkan seri per jam menjadi baris siap tampil, mulai dari jam observasi. */
export function forecastRows(rain: RainReading, startTime: string, count: number): ForecastRow[] {
  const byTime = (points: HourPoint[]) => new Map(points.map((p) => [p.time.slice(0, 13), p.value]));
  const probability = byTime(rain.hourlyProbability);
  const temperature = byTime(rain.hourlyTemperature);
  const code = byTime(rain.hourlyCode);

  const hour = startTime.slice(0, 13);
  const start = Math.max(
    0,
    rain.hourly.findIndex((p) => p.time.slice(0, 13) === hour),
  );

  return rain.hourly.slice(start, start + count).map((point) => {
    const key = point.time.slice(0, 13);
    return {
      time: point.time,
      mm: point.value,
      temperature: temperature.get(key) ?? null,
      probability: probability.get(key) ?? null,
      code: code.get(key) ?? null,
    };
  });
}
