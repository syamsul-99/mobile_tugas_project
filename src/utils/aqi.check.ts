import { categorizeAqi } from './aqi';

function check(value: number | null, expected: unknown) {
  const actual = categorizeAqi(value);
  if (actual !== expected) {
    throw new Error(`categorizeAqi(${String(value)}) = ${String(actual)}, expected ${String(expected)}`);
  }
}

// Batas US AQI (EPA): 50 / 100 / 150 / 200 / 300.
check(0, 'good');
check(50, 'good');
check(51, 'moderate');
check(100, 'moderate');
check(101, 'usg');
check(150, 'usg');
check(151, 'unhealthy');
check(200, 'unhealthy');
check(201, 'veryUnhealthy');
check(300, 'veryUnhealthy');
check(301, 'hazardous');
check(null, null);
check(Number.NaN, null);
check(-1, null);

console.log('aqi check ok');
