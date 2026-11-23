import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/design';
import { useLocationFeed } from '@/hooks/useLocationFeed';
import { hourLabel, isStale, peakOf, windowFrom } from '@/services/airQualityService';
import { useMonitoring } from '@/stores/monitoringStore';
import { AQI_COLOR, AQI_LABEL, categorizeAqi } from '@/utils/aqi';
import { forecastRows } from '@/utils/forecast';
import { weatherLabel } from '@/utils/weather';
import type { HourPoint } from '@/types/air';

const TREND_HOURS = 6;
const PEAK_HOURS = 12;
const FORECAST_HOURS = 6;
const BAR_MAX = 64;

function clockLabel(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function mm(value: number | null): string {
  return value === null ? '—' : value.toFixed(1);
}

interface MetricProps {
  label: string;
  value: number | null;
  unit: string;
}

function Metric({ label, value, unit }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value === null ? '—' : Math.round(value)}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function Trend({ points }: { points: HourPoint[] }) {
  const max = Math.max(50, ...points.map((p) => p.value ?? 0));
  return (
    <View style={styles.chart}>
      {points.map((point) => {
        const category = categorizeAqi(point.value);
        const height = point.value === null ? 4 : Math.max(6, (point.value / max) * BAR_MAX);
        return (
          <View key={point.time} style={styles.chartColumn}>
            <View
              style={[
                styles.bar,
                { height, backgroundColor: category ? AQI_COLOR[category] : colors.line },
              ]}
            />
            <Text style={styles.barLabel}>{hourLabel(point.time)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Skeleton() {
  return (
    <View style={styles.card} accessible accessibilityLabel="Memuat data lingkungan">
      <View style={[styles.skeletonBlock, { width: '45%', height: 52 }]} />
      <View style={[styles.skeletonBlock, { width: '70%', height: 14, marginTop: space.lg }]} />
      <View style={[styles.skeletonBlock, { width: '100%', height: 72, marginTop: space.xl }]} />
    </View>
  );
}

export default function HomeScreen() {
  const snapshot = useMonitoring((s) => s.snapshot);
  const loading = useMonitoring((s) => s.loading);
  const refreshing = useMonitoring((s) => s.refreshing);
  const error = useMonitoring((s) => s.error);
  const permission = useMonitoring((s) => s.permission);
  const usesDeviceLocation = useMonitoring((s) => s.usesDeviceLocation);
  const placeLabel = useMonitoring((s) => s.placeLabel);
  const coords = useMonitoring((s) => s.coords);
  const bootstrap = useMonitoring((s) => s.bootstrap);
  const refresh = useMonitoring((s) => s.refresh);
  const requestLocation = useMonitoring((s) => s.requestLocation);

  useLocationFeed(permission === 'granted' && usesDeviceLocation);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const derived = useMemo(() => {
    if (!snapshot) return null;
    const { reading, rain } = snapshot;
    const category = categorizeAqi(reading.aqiUs);
    const next = windowFrom(rain.hourly, reading.observedAt, PEAK_HOURS);
    return {
      category,
      stale: isStale(snapshot),
      trend: windowFrom(reading.hourlyAqi, reading.observedAt, TREND_HOURS),
      peak: peakOf(next),
      forecast: forecastRows(rain, reading.observedAt, FORECAST_HOURS),
      pollutants: [
        { label: 'O₃', value: reading.o3, unit: 'µg/m³', digits: 1 },
        { label: 'NO₂', value: reading.no2, unit: 'µg/m³', digits: 1 },
        { label: 'SO₂', value: reading.so2, unit: 'µg/m³', digits: 1 },
        { label: 'CO', value: reading.co, unit: 'µg/m³', digits: 0 },
        { label: 'Debu', value: reading.dust, unit: 'µg/m³', digits: 1 },
        { label: 'AOD', value: reading.aod, unit: 'tanpa satuan', digits: 2 },
      ],
    };
  }, [snapshot]);

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const onEnableLocation = useCallback(() => {
    void requestLocation();
  }, [requestLocation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.wordmark}>UdaraWaspada</Text>
          <Pressable
            onPress={() => router.push('/map')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Buka peta laporan warga"
          >
            <Text style={styles.link}>Peta</Text>
          </Pressable>
        </View>

        <View style={styles.locationRow}>
          <View style={styles.locationBlock}>
            <Text style={styles.location} numberOfLines={1}>
              {placeLabel}
            </Text>
            <Text style={styles.coords}>
              {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
            </Text>
          </View>
          <Pressable
            onPress={onEnableLocation}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Gunakan lokasi perangkat"
          >
            <Text style={styles.link}>{usesDeviceLocation ? 'Perbarui' : 'Gunakan lokasi'}</Text>
          </Pressable>
        </View>

        {derived?.stale && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Data tidak dapat diperbarui. Angka di bawah adalah data terakhir yang tersimpan.
            </Text>
          </View>
        )}

        {error && (
          <View style={[styles.notice, styles.noticeError]}>
            <Text style={styles.noticeText}>{error}</Text>
            <Pressable onPress={onRefresh} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Coba lagi</Text>
            </Pressable>
          </View>
        )}

        {loading && !snapshot && <Skeleton />}

        {!loading && !snapshot && (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>Data belum tersedia</Text>
            <Text style={styles.caption}>
              Periksa koneksi internet lalu muat ulang. Aplikasi tidak menampilkan angka perkiraan
              tanpa sumber data.
            </Text>
            <Pressable style={styles.button} onPress={onRefresh} accessibilityRole="button">
              <Text style={styles.buttonText}>Muat ulang</Text>
            </Pressable>
          </View>
        )}

        {snapshot && derived && (
          <>
            <View style={styles.card}>
              <View style={styles.aqiRow}>
                <Text style={[styles.aqiValue, { color: derived.category ? AQI_COLOR[derived.category] : colors.ink }]}>
                  {snapshot.reading.aqiUs === null ? '—' : Math.round(snapshot.reading.aqiUs)}
                </Text>
                <View style={styles.aqiMeta}>
                  <Text style={[styles.aqiLabel, { color: derived.category ? AQI_COLOR[derived.category] : colors.inkMuted }]}>
                    {derived.category ? AQI_LABEL[derived.category] : 'Tidak tersedia'}
                  </Text>
                  <Text style={styles.caption}>US AQI · indeks kualitas udara</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metricsRow}>
                <Metric label="PM2.5" value={snapshot.reading.pm25} unit="µg/m³" />
                <Metric label="PM10" value={snapshot.reading.pm10} unit="µg/m³" />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Polutan lain</Text>
                <Text style={styles.caption}>konsentrasi permukaan</Text>
              </View>
              <View style={styles.pollutantGrid}>
                {derived.pollutants.map((item) => (
                  <View key={item.label} style={styles.pollutant}>
                    <Text style={styles.metricLabel}>{item.label}</Text>
                    <Text style={styles.pollutantValue}>
                      {item.value === null ? '—' : item.value.toFixed(item.digits)}
                    </Text>
                    <Text style={styles.pollutantUnit}>{item.unit}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>AQI {TREND_HOURS} jam ke depan</Text>
                <Text style={styles.caption}>US AQI</Text>
              </View>
              <Trend points={derived.trend} />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Perkiraan {FORECAST_HOURS} jam</Text>
                <Text style={styles.caption}>suhu · hujan · peluang</Text>
              </View>
              {derived.forecast.map((row, index) => (
                <View
                  key={row.time}
                  style={[styles.hourRow, index > 0 && styles.hourRowBorder]}
                >
                  <Text style={styles.hourTime}>{hourLabel(row.time)}</Text>
                  <Text style={styles.hourCondition} numberOfLines={1}>
                    {weatherLabel(row.code)}
                  </Text>
                  <Text style={styles.hourValue}>
                    {row.temperature === null ? '—' : `${Math.round(row.temperature)}°`}
                  </Text>
                  <Text style={styles.hourValue}>
                    {row.mm === null ? '—' : `${row.mm.toFixed(1)} mm`}
                  </Text>
                  <Text style={styles.hourProb}>
                    {row.probability === null ? '—' : `${Math.round(row.probability)}%`}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Prakiraan hujan</Text>
                <Text style={styles.caption}>
                  {snapshot.rain.temperatureC === null
                    ? 'Suhu —'
                    : `Suhu ${snapshot.rain.temperatureC.toFixed(1)} °C`}
                </Text>
              </View>

              <View style={styles.rainRow}>
                <Text style={styles.rainValue}>
                  {mm(snapshot.rain.currentMm)}
                  <Text style={styles.rainUnit}> mm</Text>
                </Text>
                <Text style={styles.caption}>
                  Peluang {snapshot.rain.probability === null ? '—' : Math.round(snapshot.rain.probability)}%
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.rainRow}>
                <Text style={styles.rowLabel}>Puncak {PEAK_HOURS} jam</Text>
                <Text style={styles.rowValue}>
                  {derived.peak?.value === null || !derived.peak
                    ? 'Tidak ada hujan signifikan'
                    : `${mm(derived.peak.value)} mm/jam · ${hourLabel(derived.peak.time)}`}
                </Text>
              </View>
            </View>

            {permission === 'undetermined' && (
              <Pressable
                style={[styles.card, styles.promptCard]}
                onPress={onEnableLocation}
                accessibilityRole="button"
              >
                <Text style={styles.promptTitle}>Aktifkan lokasi</Text>
                <Text style={styles.caption}>
                  Data di atas memakai area default. Izinkan akses lokasi untuk kondisi di sekitar
                  Anda.
                </Text>
              </Pressable>
            )}

            <Text style={styles.footnote}>
              Sumber: Open-Meteo. Nilai adalah perkiraan model, bukan pengukuran sensor di titik
              Anda. Diperbarui {clockLabel(snapshot.fetchedAt)}.
            </Text>

            {refreshing && <ActivityIndicator color={colors.accent} style={styles.inlineLoader} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  wordmark: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: colors.ink },
  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationBlock: { flex: 1, gap: 2, paddingRight: space.md },
  location: { fontSize: 15, color: colors.inkMuted },
  coords: { fontSize: 11, color: colors.inkFaint, fontVariant: ['tabular-nums'] },
  link: { fontSize: 13, fontWeight: '600', color: colors.accent },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
  },
  aqiRow: { flexDirection: 'row', alignItems: 'center' },
  aqiValue: { fontSize: 56, lineHeight: 62, fontWeight: '700', fontVariant: ['tabular-nums'] },
  aqiMeta: { flex: 1, paddingLeft: space.lg, gap: space.xs },
  aqiLabel: { fontSize: 16, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 17, color: colors.inkFaint },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: space.lg },
  metricsRow: { flexDirection: 'row' },
  metric: { flex: 1, gap: space.xs },
  metricLabel: { fontSize: 12, color: colors.inkFaint },
  metricValue: { fontSize: 20, fontWeight: '600', color: colors.ink, fontVariant: ['tabular-nums'] },
  metricUnit: { fontSize: 12, fontWeight: '400', color: colors.inkFaint },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.lg },
  pollutantGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.lg, rowGap: space.lg },
  pollutant: { width: '33.33%', gap: 2 },
  pollutantValue: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  pollutantUnit: { fontSize: 10, color: colors.inkFaint },
  hourRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, gap: space.sm },
  hourRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  hourTime: {
    width: 42,
    fontSize: 12,
    color: colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
  hourCondition: { flex: 1, fontSize: 12, color: colors.ink },
  hourValue: {
    width: 48,
    fontSize: 12,
    color: colors.ink,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  hourProb: {
    width: 36,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  chartColumn: { flex: 1, alignItems: 'center', gap: space.sm },
  bar: { width: '100%', borderRadius: 3 },
  barLabel: { fontSize: 10, color: colors.inkFaint, fontVariant: ['tabular-nums'] },
  rainRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  rainValue: { fontSize: 28, fontWeight: '600', color: colors.ink, fontVariant: ['tabular-nums'] },
  rainUnit: { fontSize: 13, fontWeight: '400', color: colors.inkFaint },
  rowLabel: { fontSize: 13, color: colors.inkMuted },
  rowValue: { flex: 1, fontSize: 13, fontWeight: '500', color: colors.ink, textAlign: 'right' },
  notice: {
    borderLeftWidth: 2,
    borderLeftColor: colors.moderate,
    backgroundColor: colors.surface,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  noticeError: { borderLeftColor: colors.unhealthy },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  skeletonBlock: { backgroundColor: colors.accentSoft, borderRadius: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: space.sm },
  button: {
    alignSelf: 'flex-start',
    marginTop: space.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  buttonText: { fontSize: 13, fontWeight: '600', color: colors.surface },
  promptCard: { borderStyle: 'dashed', gap: space.xs },
  promptTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  footnote: { fontSize: 11, lineHeight: 16, color: colors.inkFaint },
  inlineLoader: { marginTop: space.sm },
});
