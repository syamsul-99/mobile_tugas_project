import * as Location from 'expo-location';
import { create } from 'zustand';

import { ApiError, fetchSnapshot } from '@/services/airQualityService';
import { describePlace } from '@/services/placeService';
import { readCachedSnapshot, writeCachedSnapshot } from '@/services/snapshotCache';
import type { Coords, Snapshot } from '@/types/air';
import { haversineMeters } from '@/utils/haversine';

/** Titik awal saat izin lokasi belum ada. Bukan data palsu: dipakai untuk area default. */
const DEFAULT_PLACE: Coords & { label: string } = {
  lat: -6.9175,
  lon: 107.6191,
  label: 'Bandung · lokasi default',
};

let inFlight = false;
/** Titik terakhir yang sudah di-geocode, untuk membatasi panggilan geocoder. */
let lastGeocoded: Coords | null = null;

function messageOf(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'Terjadi kesalahan saat memuat data.';
}

export type Permission = 'granted' | 'denied' | 'undetermined';

const statusOf = (p: Location.LocationPermissionResponse): Permission =>
  p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';

interface MonitoringState {
  coords: Coords;
  placeLabel: string;
  usesDeviceLocation: boolean;
  permission: Permission;
  snapshot: Snapshot | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  bootstrapped: boolean;

  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  requestLocation: () => Promise<void>;
  commitLocation: (coords: Coords) => void;
  commitSnapshot: (snapshot: Snapshot) => void;
  failFetch: (message: string) => void;
  resolvePlaceLabel: (coords: Coords) => Promise<void>;
}

export const useMonitoring = create<MonitoringState>()((set, get) => ({
  coords: { lat: DEFAULT_PLACE.lat, lon: DEFAULT_PLACE.lon },
  placeLabel: DEFAULT_PLACE.label,
  usesDeviceLocation: false,
  permission: 'undetermined',
  snapshot: null,
  loading: true,
  refreshing: false,
  error: null,
  bootstrapped: false,

  bootstrap: async () => {
    if (get().bootstrapped) return;
    set({ bootstrapped: true });

    // Tampilkan data terakhir dari disk lebih dulu agar aplikasi tetap berguna offline.
    const cached = await readCachedSnapshot();
    if (cached) set({ snapshot: cached, loading: false });

    try {
      const permission = await Location.getForegroundPermissionsAsync();
      set({ permission: statusOf(permission) });
      if (permission.granted) {
        await get().requestLocation();
      } else {
        await get().refresh();
      }
    } catch {
      set({ loading: false, error: 'Izin lokasi tidak dapat diperiksa.' });
    }
  },

  requestLocation: async () => {
    try {
      const request = await Location.requestForegroundPermissionsAsync();
      set({ permission: statusOf(request) });
      if (!request.granted) {
        await get().refresh();
        set({ error: 'Izin lokasi ditolak. Menampilkan area default.' });
        return;
      }

      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
      const position =
        last ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

      const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
      set({
        coords,
        placeLabel: 'Lokasi perangkat',
        usesDeviceLocation: true,
        error: null,
      });
      void get().resolvePlaceLabel(coords);
      await get().refresh();
    } catch {
      await get().refresh();
      set({ error: 'Lokasi tidak dapat dibaca. Menampilkan area default.' });
    }
  },

  refresh: async () => {
    if (inFlight) return;
    inFlight = true;
    const hasData = get().snapshot !== null;
    set({ loading: !hasData, refreshing: hasData, error: null });

    try {
      get().commitSnapshot(await fetchSnapshot(get().coords));
    } catch (e) {
      get().failFetch(messageOf(e));
    } finally {
      inFlight = false;
    }
  },

  commitLocation: (coords) => {
    set({ coords, usesDeviceLocation: true });
    void get().resolvePlaceLabel(coords);
  },

  commitSnapshot: (snapshot) => {
    set({ snapshot, loading: false, refreshing: false, error: null });
    void writeCachedSnapshot(snapshot);
  },

  failFetch: (message) => {
    set({ loading: false, refreshing: false, error: message });
  },

  resolvePlaceLabel: async (coords) => {
    if (lastGeocoded && (haversineMeters(lastGeocoded, coords) ?? Infinity) < 1_000) return;
    lastGeocoded = coords;
    const label = await describePlace(coords);
    if (label) set({ placeLabel: label });
  },
}));
