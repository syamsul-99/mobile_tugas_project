import type { Report } from '@/types/report';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/**
 * DATASET DEMONSTRASI. Belum ada backend laporan warga, sehingga seluruh entri
 * di bawah adalah contoh yang ditandai `isSample: true` dan diberi label
 * "Data contoh" di UI. Bukan laporan masyarakat sungguhan.
 */
export const SAMPLE_REPORTS: Report[] = [
  {
    id: 'demo-01',
    title: 'Genangan setinggi lutut di Jl. Dago',
    category: 'flood',
    description:
      'Air menggenang sejak hujan sore, dua lajur tidak dapat dilalui kendaraan rendah.',
    latitude: -6.885,
    longitude: 107.613,
    reportedAt: minutesAgo(35),
    isSample: true,
  },
  {
    id: 'demo-02',
    title: 'Tebing longsor menutup bahu jalan',
    category: 'landslide',
    description: 'Material tanah menutup sebagian bahu jalan Ciumbuleuit, belum ada pengerahan alat.',
    latitude: -6.873,
    longitude: 107.604,
    reportedAt: minutesAgo(90),
    isSample: true,
  },
  {
    id: 'demo-03',
    title: 'Kebakaran kios di sekitar Pasar Baru',
    category: 'fire',
    description: 'Api terlihat dari dua kios, petugas sudah dihubungi warga sekitar.',
    latitude: -6.916,
    longitude: 107.604,
    reportedAt: minutesAgo(12),
    isSample: true,
  },
  {
    id: 'demo-04',
    title: 'Pohon tumbang menutup jalur',
    category: 'emergency',
    description: 'Satu pohon tumbang menutup jalur kendaraan, tidak ada korban dilaporkan.',
    latitude: -6.9025,
    longitude: 107.6188,
    reportedAt: minutesAgo(150),
    isSample: true,
  },
  {
    id: 'demo-05',
    title: 'Lubang lebar di Jl. Pasteur',
    category: 'road',
    description: 'Lubang berdiameter sekitar satu meter membahayakan pengendara motor malam hari.',
    latitude: -6.893,
    longitude: 107.588,
    reportedAt: minutesAgo(300),
    isSample: true,
  },
  {
    id: 'demo-06',
    title: 'Railing jembatan Cikapundung lepas',
    category: 'bridge',
    description: 'Railing sisi timur jembatan lepas, tersisa empat meter tanpa pengaman.',
    latitude: -6.9,
    longitude: 107.621,
    reportedAt: minutesAgo(420),
    isSample: true,
  },
  {
    id: 'demo-07',
    title: 'Lampu halte Dago tidak menyala',
    category: 'facility',
    description: 'Penerangan halte mati sejak dua hari, area gelap pada malam hari.',
    latitude: -6.8855,
    longitude: 107.6165,
    reportedAt: minutesAgo(600),
    isSample: true,
  },
];
