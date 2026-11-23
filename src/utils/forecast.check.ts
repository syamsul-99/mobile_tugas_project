import { forecastRows } from './forecast';
import type { RainReading } from '@/types/air';

const at = (hour: number) => `2026-11-11T${String(hour).padStart(2, '0')}:00`;

const rain: RainReading = {
  currentMm: 0.2,
  temperatureC: 28,
  probability: 40,
  hourly: [15, 16, 17, 18].map((h) => ({ time: at(h), value: h === 17 ? 1.4 : null })),
  hourlyProbability: [15, 16, 17, 18].map((h) => ({ time: at(h), value: h * 2 })),
  hourlyTemperature: [15, 16, 17, 18].map((h) => ({ time: at(h), value: 20 + h })),
  hourlyCode: [15, 16, 17, 18].map((h) => ({ time: at(h), value: h === 17 ? 61 : 3 })),
};

// current.time bisa 15 menit (16:15) tetapi seri hourly tetap 16:00.
const rows = forecastRows(rain, '2026-11-11T16:15', 2);
if (rows.length !== 2) throw new Error(`rows: ${rows.length}`);
if (rows[0].time !== at(16)) throw new Error(`start: ${rows[0].time}`);
if (rows[0].temperature !== 36) throw new Error(`temp: ${rows[0].temperature}`);
if (rows[1].mm !== 1.4) throw new Error(`mm: ${rows[1].mm}`);
if (rows[1].code !== 61) throw new Error(`code: ${rows[1].code}`);
if (rows[1].probability !== 34) throw new Error(`prob: ${rows[1].probability}`);

console.log('forecast check ok');
