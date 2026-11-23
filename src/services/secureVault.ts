import * as SecureStore from 'expo-secure-store';

/**
 * Data sensitif (token sesi, NIK) disimpan di Keystore (Android) / Keychain (iOS),
 * bukan di AsyncStorage yang isinya teks biasa.
 * THIS_DEVICE_ONLY: nilai tidak ikut dipulihkan ke perangkat lain.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const KEYS = {
  token: 'udarawaspada.token',
  nik: 'udarawaspada.nik',
} as const;

export type SecretName = keyof typeof KEYS;

export class SecureStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecureStorageError';
  }
}

async function isAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function readSecret(name: SecretName): Promise<string | null> {
  if (!(await isAvailable())) return null;
  try {
    return await SecureStore.getItemAsync(KEYS[name], OPTIONS);
  } catch {
    return null;
  }
}

/** String kosong berarti hapus, supaya tidak ada entri dengan nilai kosong. */
export async function writeSecret(name: SecretName, value: string): Promise<void> {
  if (!(await isAvailable())) {
    throw new SecureStorageError('Penyimpanan terenkripsi hanya tersedia di Android/iOS.');
  }
  const trimmed = value.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(KEYS[name], OPTIONS);
    return;
  }
  await SecureStore.setItemAsync(KEYS[name], trimmed, OPTIONS);
}

export async function clearSecrets(): Promise<void> {
  if (!(await isAvailable())) return;
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key, OPTIONS)));
}

/** NIK tidak pernah ditampilkan penuh setelah tersimpan. */
export function maskNik(nik: string): string {
  return nik.length <= 4 ? '••••' : `••••••••${nik.slice(-4)}`;
}
