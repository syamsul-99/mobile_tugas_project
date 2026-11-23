import { formatDistance, haversineKm, haversineMeters, isValidCoordinate } from './haversine';

function check(label: string, actual: number | null, expected: number, tolerance: number) {
  if (actual === null) throw new Error(`${label}: null`);
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: ${actual.toFixed(2)}, expected ${expected} ± ${tolerance}`);
  }
}

function expectNull(label: string, actual: number | null) {
  if (actual !== null) throw new Error(`${label}: expected null, got ${actual}`);
}

const bandung = { lat: -6.9175, lon: 107.6191 };

check('titik sama', haversineMeters(bandung, bandung), 0, 0.001);
// 1 derajat lintang ≈ 111.195 km (radius 6.371 km).
check('1 derajat lintang', haversineMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }), 111_195, 5);
check(
  '1 derajat bujur di ekuator',
  haversineMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }),
  111_195,
  5,
);
check(
  'simetris',
  haversineMeters(bandung, { lat: -6.2, lon: 106.8166 }),
  haversineMeters({ lat: -6.2, lon: 106.8166 }, bandung) ?? -1,
  0.001,
);
check('Bandung-Jakarta', haversineMeters(bandung, { lat: -6.2088, lon: 106.8456 }), 118_000, 3_000);
check('Bandung-Jakarta (km)', haversineKm(bandung, { lat: -6.2088, lon: 106.8456 }), 118, 3);

// Koordinat tidak valid tidak boleh menghasilkan NaN.
expectNull('lat > 90', haversineMeters({ lat: 91, lon: 0 }, bandung));
expectNull('lon > 180', haversineMeters({ lat: 0, lon: 181 }, bandung));
expectNull('NaN', haversineMeters({ lat: Number.NaN, lon: 0 }, bandung));
expectNull('Infinity', haversineMeters({ lat: 0, lon: Number.POSITIVE_INFINITY }, bandung));
if (isValidCoordinate({ lat: 91, lon: 0 })) throw new Error('isValidCoordinate(91) harus false');

if (formatDistance(820) !== '820 m') throw new Error(`formatDistance(820): ${formatDistance(820)}`);
if (formatDistance(1400) !== '1,4 km') throw new Error(`formatDistance(1400): ${formatDistance(1400)}`);
if (formatDistance(null) !== '—') throw new Error('formatDistance(null) harus "—"');

console.log('haversine check ok');
