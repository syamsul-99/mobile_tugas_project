import type { LocationSubscription } from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_DISTANCE_INTERVAL, distanceIntervalForSpeed } from '@/constants/location';
import {
  getCurrentLocation,
  getPermission,
  requestPermission,
  watchLocation,
} from '@/services/locationService';
import {
  LocationError,
  type LocationPermissionStatus,
  type TrackedLocation,
} from '@/types/location';

export interface UseLocationTrackingResult {
  location: TrackedLocation | null;
  permissionStatus: LocationPermissionStatus;
  isLoading: boolean;
  isTracking: boolean;
  error: string | null;
  requestAccess: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  refreshLocation: () => Promise<void>;
}

interface Options {
  /** Periksa izin saat mount dan mulai tracking bila sudah diizinkan. */
  autoStart?: boolean;
}

const messageOf = (e: unknown, fallback: string) =>
  e instanceof LocationError ? e.message : fallback;

/**
 * Mengelola izin, posisi awal, dan pemantauan lokasi foreground.
 * Semua subscription dibersihkan saat unmount; tidak ada state update setelahnya.
 */
export function useLocationTracking({ autoStart = false }: Options = {}): UseLocationTrackingResult {
  const [location, setLocation] = useState<TrackedLocation | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const intervalRef = useRef<number>(DEFAULT_DISTANCE_INTERVAL);
  const tokenRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tokenRef.current += 1;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  const startWatcherRef = useRef<(interval: number) => Promise<void>>(async () => {});

  /** Memulai watcher dengan interval tertentu; watcher lama selalu dilepas lebih dulu. */
  const startWatcher = useCallback(async (interval: number) => {
    const token = ++tokenRef.current;
    intervalRef.current = interval;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;

    try {
      const subscription = await watchLocation(
        interval,
        (next) => {
          if (!mountedRef.current || token !== tokenRef.current) return;
          setLocation(next);
          setError(null);
          const desired = distanceIntervalForSpeed(next.speed);
          if (desired !== intervalRef.current) void startWatcherRef.current(desired);
        },
        (watchError) => {
          if (mountedRef.current && token === tokenRef.current) setError(watchError.message);
        },
      );

      if (!mountedRef.current || token !== tokenRef.current) {
        subscription.remove();
        return;
      }
      subscriptionRef.current = subscription;
      setIsTracking(true);
    } catch (e) {
      if (mountedRef.current && token === tokenRef.current) {
        setError(messageOf(e, 'Pemantauan lokasi gagal dimulai.'));
        setIsTracking(false);
      }
    }
  }, []);

  useEffect(() => {
    startWatcherRef.current = startWatcher;
  }, [startWatcher]);

  const stopTracking = useCallback(() => {
    tokenRef.current += 1;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await getPermission();
      if (!mountedRef.current) return;
      setPermissionStatus(status);
      if (status !== 'granted') {
        throw new LocationError('permission', 'Izin lokasi belum diberikan.');
      }

      const initial = await getCurrentLocation();
      if (!mountedRef.current) return;
      setLocation(initial);
      await startWatcher(distanceIntervalForSpeed(initial.speed));
    } catch (e) {
      if (mountedRef.current) setError(messageOf(e, 'Lokasi gagal diperoleh.'));
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [startWatcher]);

  const requestAccess = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await requestPermission();
      if (!mountedRef.current) return;
      setPermissionStatus(status);
      if (status !== 'granted') {
        setError('Izin lokasi ditolak. Aktifkan izin lewat Pengaturan atau pakai lokasi simulasi.');
        return;
      }
      const initial = await getCurrentLocation();
      if (!mountedRef.current) return;
      setLocation(initial);
      await startWatcher(distanceIntervalForSpeed(initial.speed));
    } catch (e) {
      if (mountedRef.current) setError(messageOf(e, 'Izin lokasi tidak dapat diminta.'));
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [startWatcher]);

  const refreshLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const current = await getCurrentLocation();
      if (!mountedRef.current) return;
      setLocation(current);
    } catch (e) {
      if (mountedRef.current) setError(messageOf(e, 'Lokasi gagal diperbarui.'));
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    let cancelled = false;

    (async () => {
      try {
        const status = await getPermission();
        if (cancelled || !mountedRef.current) return;
        setPermissionStatus(status);
        if (status === 'granted') await startTracking();
      } catch (e) {
        if (!cancelled && mountedRef.current) setError(messageOf(e, 'Status izin gagal dibaca.'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoStart, startTracking]);

  return {
    location,
    permissionStatus,
    isLoading,
    isTracking,
    error,
    requestAccess,
    startTracking,
    stopTracking,
    refreshLocation,
  };
}
