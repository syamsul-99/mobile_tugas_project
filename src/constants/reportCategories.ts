import type { ReportCategory, ReportGroup } from '@/types/report';

interface CategoryMeta {
  label: string;
  group: ReportGroup;
  color: string;
}

/** Warna dipakai fungsional: membedakan kategori, bukan dekorasi. */
export const REPORT_CATEGORIES: Record<ReportCategory, CategoryMeta> = {
  flood: { label: 'Banjir', group: 'bencana', color: '#1B6CA8' },
  landslide: { label: 'Longsor', group: 'bencana', color: '#7A5230' },
  fire: { label: 'Kebakaran', group: 'bencana', color: '#B3261E' },
  emergency: { label: 'Darurat lain', group: 'bencana', color: '#6E3B8A' },
  road: { label: 'Jalan rusak', group: 'infrastruktur', color: '#5A6472' },
  bridge: { label: 'Jembatan rusak', group: 'infrastruktur', color: '#3F6B52' },
  facility: { label: 'Fasilitas umum', group: 'infrastruktur', color: '#A9770A' },
};

export const REPORT_GROUPS: { group: ReportGroup; label: string }[] = [
  { group: 'bencana', label: 'Bencana' },
  { group: 'infrastruktur', label: 'Infrastruktur' },
];
