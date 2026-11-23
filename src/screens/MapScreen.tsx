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
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Text style={styles.back}>Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Peta laporan</Text>
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
            style={[styles.locateButton, { bottom: space.lg }]}
            onPress={handleLocate}
            accessibilityRole="button"
            accessibilityLabel="Pusatkan ke lokasi saya"
          >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    backgroundColor: colors.bg,
    gap: space.md,
  },
  back: { fontSize: 13, fontWeight: '600', color: colors.accent },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  sampleChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  sampleChipText: { fontSize: 10, color: colors.inkMuted },
  mapWrapper: { flex: 1, overflow: 'hidden' },
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
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  statusText: { fontSize: 11, color: colors.inkMuted },
  errorBanner: {
    backgroundColor: colors.surface,
    borderLeftWidth: 2,
    borderLeftColor: colors.unhealthy,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  errorText: { fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  link: { fontSize: 12, fontWeight: '600', color: colors.accent },
  permissionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
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
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  locateText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  simulationNotice: {
    position: 'absolute',
    left: space.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    maxWidth: 180,
  },
  simulationText: { fontSize: 10, lineHeight: 14, color: colors.inkMuted },
  hintWrapper: { position: 'absolute', bottom: space.xxl + space.lg, alignSelf: 'center' },
  hint: {
    fontSize: 11,
    color: colors.inkMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
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
