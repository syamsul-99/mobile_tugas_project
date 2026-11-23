import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/design';
import { REPORT_CATEGORIES } from '@/constants/reportCategories';
import { SAMPLE_REPORTS } from '@/data/sampleReports';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import type { ReportWithDistance } from '@/types/report';
import { formatDistance, haversineMeters } from '@/utils/haversine';

/**
 * Fallback web. `react-native-maps` tidak punya implementasi web, jadi peta
 * interaktif hanya tersedia di Android/iOS. Di web laporan ditampilkan sebagai daftar.
 */
export default function MapScreenWeb() {
  const insets = useSafeAreaInsets();
  const { location, error, isLoading, requestAccess } = useLocationTracking();

  const reports = useMemo<ReportWithDistance[]>(() => {
    const origin = location ? { lat: location.latitude, lon: location.longitude } : null;
    return SAMPLE_REPORTS.map((report) => ({
      ...report,
      distanceM: origin
        ? haversineMeters(origin, { lat: report.latitude, lon: report.longitude })
        : null,
    }));
  }, [location]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xxl },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Text style={styles.link}>Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Peta laporan</Text>
        <View style={styles.chip}>
          <Text style={styles.chipText}>Data contoh</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Peta interaktif hanya tersedia di aplikasi Android/iOS. Di browser, laporan ditampilkan
          sebagai daftar.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.button}
          onPress={requestAccess}
          accessibilityRole="button"
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Mengambil lokasi…' : location ? 'Perbarui lokasi' : 'Gunakan lokasi'}
          </Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <View style={styles.list}>
        {reports.map((report) => {
          const meta = REPORT_CATEGORIES[report.category];
          return (
            <View key={report.id} style={styles.row}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: meta.color,
                    borderRadius: meta.group === 'bencana' ? 5 : 2,
                  },
                ]}
              />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{report.title}</Text>
                <Text style={styles.rowMeta}>
                  {meta.label} · {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                </Text>
              </View>
              <Text style={styles.distance}>{formatDistance(report.distanceM)}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.footnote}>
        Jarak dihitung lurus dengan Haversine, bukan jarak tempuh jalan.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  link: { fontSize: 13, fontWeight: '600', color: colors.accent },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  chipText: { fontSize: 10, color: colors.inkMuted },
  notice: {
    backgroundColor: colors.surface,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  noticeText: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  actions: { gap: space.xs },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  buttonText: { fontSize: 12, fontWeight: '600', color: colors.surface },
  error: { fontSize: 11, lineHeight: 16, color: colors.unhealthy },
  list: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  swatch: { width: 10, height: 10 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: colors.ink },
  rowMeta: { fontSize: 11, color: colors.inkFaint, fontVariant: ['tabular-nums'] },
  distance: { fontSize: 12, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
  footnote: { fontSize: 10, lineHeight: 15, color: colors.inkFaint },
});
