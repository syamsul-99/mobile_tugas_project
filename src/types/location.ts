export type LocationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface TrackedLocation {
  latitude: number;
  longitude: number;
  /** Radius akurasi dalam meter, null bila platform tidak menyediakan. */
  accuracy: number | null;
  /** Waktu posisi diperoleh (epoch ms). */
  timestamp: number;
  /** Kecepatan m/s bila tersedia. */
  speed: number | null;
}

export type LocationErrorKind = 'permission' | 'unavailable' | 'timeout' | 'failed';

export class LocationError extends Error {
  constructor(
    readonly kind: LocationErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'LocationError';
  }
}
