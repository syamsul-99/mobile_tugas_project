import * as Location from 'expo-location';

import { LOCATION_TIMEOUT_MS, TRACKING_TIME_INTERVAL_MS } from '@/constants/location';
import {
  LocationError,
  type LocationPermissionStatus,
  type TrackedLocation,
} from '@/types/location';

export function toTrackedLocation(position: Location.LocationObject): TrackedLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    timestamp: position.timestamp,
    speed: position.coords.speed ?? null,
  };
}

export function permissionStatusOf(
  response: Location.LocationPermissionResponse,
): LocationPermissionStatus {
  if (response.granted) return 'granted';
  // canAskAgain=false berarti pengguna memilih "jangan tanya lagi".
  return response.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermission(): Promise<LocationPermissionStatus> {
  try {
    return permissionStatusOf(await Location.getForegroundPermissionsAsync());
  } catch {
    throw new LocationError('failed', 'Status izin lokasi tidak dapat dibaca.');
  }
}

export async function requestPermission(): Promise<LocationPermissionStatus> {
  try {
    return permissionStatusOf(await Location.requestForegroundPermissionsAsync());
  } catch {
    throw new LocationError('failed', 'Permintaan izin lokasi gagal.');
  }
}

export async function hasLocationServices(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/** Satu kali pengambilan posisi, dengan timeout eksplisit. */
export async function getCurrentLocation(): Promise<TrackedLocation> {
  if (!(await hasLocationServices())) {
    throw new LocationError('unavailable', 'Layanan lokasi (GPS) tidak aktif.');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new LocationError('timeout', 'Pengambilan lokasi melewati batas waktu.')),
          LOCATION_TIMEOUT_MS,
        );
      }),
    ]);
    return toTrackedLocation(position);
  } catch (e) {
    if (e instanceof LocationError) throw e;
    throw new LocationError('failed', 'Lokasi gagal diperoleh.');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function watchLocation(
  distanceInterval: number,
  onLocation: (location: TrackedLocation) => void,
  onError: (error: LocationError) => void,
): Promise<Location.LocationSubscription> {
  try {
    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval,
        timeInterval: TRACKING_TIME_INTERVAL_MS,
      },
      (position) => onLocation(toTrackedLocation(position)),
      (reason) => onError(new LocationError('failed', reason)),
    );
  } catch {
    throw new LocationError('failed', 'Pemantauan lokasi gagal dimulai.');
  }
}
