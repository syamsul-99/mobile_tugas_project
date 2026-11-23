import * as Location from 'expo-location';

import type { Coords } from '@/types/air';

/**
 * Nama tempat dari koordinat. Mengembalikan null bila geocoding gagal
 * (offline, emulator tanpa layanan geocoder) supaya label lama dipertahankan.
 */
export async function describePlace({ lat, lon }: Coords): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (!place) return null;

    const parts = [place.district ?? place.subregion, place.city, place.region].filter(
      (part): part is string => Boolean(part),
    );
    const unique = [...new Set(parts)].slice(0, 2);
    return unique.length > 0 ? unique.join(', ') : (place.name ?? null);
  } catch {
    return null;
  }
}
