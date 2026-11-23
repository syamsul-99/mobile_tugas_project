import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapLegend from '@/components/map/MapLegend';
import ReportCallout from '@/components/map/ReportCallout';
import ReportMarker from '@/components/map/ReportMarker';
import UserLocationMarker from '@/components/map/UserLocationMarker';
import { colors, space } from '@/constants/design';
import { SIMULATION_REGION } from '@/constants/location';
import { SAMPLE_REPORTS } from '@/data/sampleReports';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import type { Report, ReportWithDistance } from '@/types/report';
import { haversineMeters } from '@/utils/haversine';

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const centeredRef = useRef(false);
  const insets = useSafeAreaInsets();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [useSimulation, setUseSimulation] = useState(false);

  const { location, permissionStatus, isLoading, error, requestAccess, refreshLocation } =
    useLocationTracking({ autoStart: true });

  const latitude = location?.latitude ?? (useSimulation ? SIMULATION_REGION.latitude : null);
  const longitude = location?.longitude ?? (useSimulation ? SIMULATION_REGION.longitude : null);

  const reports = useMemo<ReportWithDistance[]>(() => {
    const origin =
      latitude !== null && longitude !== null ? { lat: latitude, lon: longitude } : null;
    return SAMPLE_REPORTS.map((report) => ({
      ...report,
      distanceM: origin
        ? haversineMeters(origin, { lat: report.latitude, lon: report.longitude })
        : null,
    }));
  }, [latitude, longitude]);

  const selected = reports.find((report) => report.id === selectedId) ?? null;
  const hasUserLocation = latitude !== null && longitude !== null;

  useEffect(() => {
    if (centeredRef.current || !hasUserLocation || latitude === null || longitude === null) return;
    centeredRef.current = true;
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 },
      500,
    );
  }, [hasUserLocation, latitude, longitude]);

  const handleSelect = useCallback((report: Report) => {
    setSelectedId(report.id);
    mapRef.current?.animateToRegion(
      {
        latitude: report.latitude,
        longitude: report.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      400,
    );
  }, []);

  const handleLocate = useCallback(async () => {
    if (useSimulation) {
      setUseSimulation(false);
    }
    if (latitude !== null && longitude !== null) {
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        400,
      );
    }
    if (permissionStatus !== 'granted') {
      await requestAccess();
      return;
    }
    await refreshLocation();
  }, [latitude, longitude, permissionStatus, refreshLocation, requestAccess, useSimulation]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Peta laporan</Text>
          <Text style={styles.subtitle}>Laporan warga di sekitar Anda</Text>
        </View>
        <View style={styles.sampleChip}>
          <Text style={styles.sampleChipText}>Data contoh</Text>
        </View>
      </View>

      <MapLegend />

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={SIMULATION_REGION}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          loadingEnabled
          onPress={() => setSelectedId(null)}
        >
          {hasUserLocation && latitude !== null && longitude !== null && (
            <UserLocationMarker
              latitude={latitude}
              longitude={longitude}
              simulated={!location}
            />
          )}

          {reports.map((report) => (
            <ReportMarker
              key={report.id}
              report={report}
              selected={report.id === selectedId}
              onPress={handleSelect}
            />
          ))}
        </MapView>

        <View style={styles.topOverlay} pointerEvents="box-none">
          {isLoading && (
            <View style={styles.statusPill}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.statusText}>Mengambil lokasi…</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={requestAccess} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Coba lagi</Text>
              </Pressable>
            </View>
          )}

          {permissionStatus !== 'granted' && !hasUserLocation && (
            <View style={styles.permissionCard}>
              <Text style={styles.permissionTitle}>Lokasi belum aktif</Text>
              <Text style={styles.permissionText}>
                Izin lokasi dipakai untuk menampilkan posisi Anda dan menghitung jarak ke laporan.
                Tanpa izin, peta tetap bisa dijelajahi.
              </Text>
              <View style={styles.permissionActions}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={requestAccess}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>Izinkan lokasi</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => setUseSimulation(true)}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryButtonText}>Lokasi simulasi</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {!selected && (
          <Pressable
            style={({ pressed }) => [styles.locateButton, { bottom: space.lg }, pressed && styles.pressed]}
            onPress={handleLocate}
            accessibilityRole="button"
            accessibilityLabel="Pusatkan ke lokasi saya"
          >
            <Text style={styles.locateIcon}>◎</Text>
            <Text style={styles.locateText}>{location ? 'Lokasi saya' : 'Aktifkan lokasi'}</Text>
          </Pressable>
        )}

        {!selected && !location && useSimulation && (
          <View style={[styles.simulationNotice, { bottom: space.lg }]}>
            <Text style={styles.simulationText}>
              Lokasi simulasi: Bandung. Bukan posisi GPS aktual.
            </Text>
          </View>
        )}

        {!selected && (
          <View style={styles.hintWrapper} pointerEvents="none">
            <Text style={styles.hint}>Ketuk marker untuk melihat detail laporan.</Text>
          </View>
        )}
      </View>

      {selected && (
        <View style={[styles.callout, { paddingBottom: insets.bottom + space.md }]}>
          <ReportCallout report={selected} onClose={() => setSelectedId(null)} />
        </View>
      )}
    </View>
  );
}

const shadow = {
  shadowColor: '#0B1220',
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: space.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  pressed: { opacity: 0.6 },
  backIcon: { fontSize: 24, lineHeight: 28, fontWeight: '700', color: colors.accent },
  titleBlock: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  subtitle: { fontSize: 11, color: colors.inkFaint, marginTop: 1 },
  sampleChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
  },
  sampleChipText: { fontSize: 10, fontWeight: '600', color: colors.accent },
  mapWrapper: { flex: 1, minHeight: 0, overflow: 'hidden' },
  topOverlay: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    right: space.md,
    gap: space.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow,
  },
  statusText: { fontSize: 11, fontWeight: '500', color: colors.inkMuted },
  errorBanner: {
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.unhealthy,
    borderRadius: 10,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    gap: space.xs,
    ...shadow,
  },
  errorText: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  link: { fontSize: 12, fontWeight: '600', color: colors.accent },
  permissionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
    ...shadow,
  },
  permissionTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  permissionText: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  permissionActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  primaryButtonText: { fontSize: 12, fontWeight: '600', color: colors.surface },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  secondaryButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkMuted },
  locateButton: {
    position: 'absolute',
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    ...shadow,
  },
  locateIcon: { fontSize: 14, color: colors.surface, lineHeight: 16 },
  locateText: { fontSize: 12, fontWeight: '600', color: colors.surface },
  simulationNotice: {
    position: 'absolute',
    left: space.lg,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    maxWidth: 180,
    ...shadow,
  },
  simulationText: { fontSize: 10, lineHeight: 14, color: colors.inkMuted },
  hintWrapper: { position: 'absolute', bottom: space.xxl + space.lg, alignSelf: 'center' },
  hint: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
    ...shadow,
  },
  callout: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
});
