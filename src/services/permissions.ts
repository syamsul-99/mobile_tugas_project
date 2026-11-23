import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

export type PermissionKind = 'camera' | 'media' | 'location';

/** `blocked` = dialog sistem tidak bisa muncul lagi, arahkan ke Pengaturan. */
export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

interface Response {
  granted: boolean;
  canAskAgain: boolean;
}

function get(kind: PermissionKind): Promise<Response> {
  switch (kind) {
    case 'camera':
      return ImagePicker.getCameraPermissionsAsync();
    case 'media':
      return ImagePicker.getMediaLibraryPermissionsAsync();
    case 'location':
      return Location.getForegroundPermissionsAsync();
  }
}

function request(kind: PermissionKind): Promise<Response> {
  switch (kind) {
    case 'camera':
      return ImagePicker.requestCameraPermissionsAsync();
    case 'media':
      return ImagePicker.requestMediaLibraryPermissionsAsync();
    case 'location':
      return Location.requestForegroundPermissionsAsync();
  }
}

/**
 * Alur Just-In-Time: periksa dulu tanpa dialog, minta hanya saat fitur dipakai.
 * Dialog sistem hanya muncul sekali per izin; sesudahnya `canAskAgain` false.
 */
export async function ensurePermission(kind: PermissionKind): Promise<PermissionOutcome> {
  try {
    const current = await get(kind);
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'blocked';
    const next = await request(kind);
    if (next.granted) return 'granted';
    return next.canAskAgain ? 'denied' : 'blocked';
  } catch {
    return 'blocked';
  }
}

export function openAppSettings(): void {
  void Linking.openSettings();
}

/**
 * Storage tidak punya izin runtime di Android 10+/iOS: akses berkas lewat
 * system picker (SAF) dan penyimpanan aplikasi memakai Scoped Storage.
 */
export const STORAGE_NEEDS_PERMISSION = false;
