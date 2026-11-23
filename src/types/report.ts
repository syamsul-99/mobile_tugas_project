export type ReportGroup = 'bencana' | 'infrastruktur';

export type ReportCategory =
  | 'flood'
  | 'landslide'
  | 'fire'
  | 'emergency'
  | 'road'
  | 'bridge'
  | 'facility';

export interface Report {
  id: string;
  title: string;
  category: ReportCategory;
  description: string;
  latitude: number;
  longitude: number;
  /** Waktu laporan dalam ISO 8601. */
  reportedAt: string;
  /** true bila data demonstrasi, bukan laporan warga sungguhan. */
  isSample: boolean;
}

export interface ReportWithDistance extends Report {
  /** Jarak lurus dari titik pengguna (meter), null bila titik pengguna belum ada. */
  distanceM: number | null;
}
