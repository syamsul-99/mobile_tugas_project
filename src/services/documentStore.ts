import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Berkas disimpan di documentDirectory milik aplikasi (Scoped Storage).
 * Tidak perlu izin storage: folder ini privat untuk aplikasi dan tidak dibaca
 * aplikasi lain. Berkas dari luar masuk lewat system picker (SAF), bukan path langsung.
 */
const FOLDER = 'dokumen';

export interface StoredDocument {
  name: string;
  uri: string;
  size: number;
  type: string;
  modifiedAt: number | null;
}

const isWeb = Platform.OS === 'web';

function docsDir(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function describe(file: File): StoredDocument {
  return {
    name: file.name,
    uri: file.uri,
    size: file.size,
    type: file.type,
    modifiedAt: file.modificationTime,
  };
}

function uniqueName(original: string): string {
  const ext = Paths.extname(original).toLowerCase();
  return `laporan-${Date.now()}${ext}`;
}

export function listDocuments(): StoredDocument[] {
  if (isWeb) return [];
  return docsDir()
    .list()
    .filter((entry): entry is File => entry instanceof File)
    .map(describe)
    .sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
}

/** Menyalin berkas dari cache picker ke sandbox agar tidak hilang saat cache dibersihkan. */
export async function importDocument(
  sourceUri: string,
  preferredName?: string,
): Promise<StoredDocument> {
  if (isWeb) throw new Error('Penyimpanan berkas hanya tersedia di perangkat.');
  const source = new File(sourceUri);
  const target = new File(docsDir(), uniqueName(preferredName ?? source.name));
  await source.copy(target);
  return describe(target);
}

export function deleteDocument(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
