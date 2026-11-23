import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Snapshot } from '@/types/air';

/** Cache offline di documentDirectory; bertahan setelah aplikasi ditutup. */
const FOLDER = 'cache';
const FILE = 'snapshot.json';

function cacheDir(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export async function readCachedSnapshot(): Promise<Snapshot | null> {
  if (Platform.OS === 'web') return null;
  try {
    const file = new File(cacheDir(), FILE);
    if (!file.exists) return null;
    return (await file.json()) as Snapshot;
  } catch {
    return null;
  }
}

export async function writeCachedSnapshot(snapshot: Snapshot): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const file = new File(cacheDir(), FILE);
    if (!file.exists) file.create({ intermediates: true });
    await file.write(JSON.stringify(snapshot));
  } catch {
    // Cache bersifat best-effort; kegagalan tulis tidak boleh menggagalkan UI.
  }
}
