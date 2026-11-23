import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/design';
import {
  deleteDocument,
  formatBytes,
  importDocument,
  listDocuments,
  type StoredDocument,
} from '@/services/documentStore';
import { ensurePermission, openAppSettings, type PermissionKind } from '@/services/permissions';
import {
  clearSecrets,
  maskNik,
  readSecret,
  writeSecret,
} from '@/services/secureVault';

interface SavedSecrets {
  token: string | null;
  nik: string | null;
}

const EMPTY: SavedSecrets = { token: null, nik: null };

export default function VaultScreen() {
  const [token, setToken] = useState('');
  const [nik, setNik] = useState('');
  const [saved, setSaved] = useState<SavedSecrets>(EMPTY);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsHint, setSettingsHint] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const refreshDocuments = useCallback(() => {
    try {
      setDocuments(listDocuments());
    } catch {
      setNotice('Daftar berkas tidak dapat dibaca.');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [storedToken, storedNik] = await Promise.all([
        readSecret('token'),
        readSecret('nik'),
      ]);
      setSaved({ token: storedToken, nik: storedNik });
      try {
        setDocuments(listDocuments());
      } catch {
        setNotice('Daftar berkas tidak dapat dibaca.');
      }
    })();
  }, []);

  const saveCredentials = useCallback(async () => {
    setBusy('save');
    setNotice(null);
    setSettingsHint(false);
    try {
      await writeSecret('token', token);
      await writeSecret('nik', nik);
      const [storedToken, storedNik] = await Promise.all([
        readSecret('token'),
        readSecret('nik'),
      ]);
      setSaved({ token: storedToken, nik: storedNik });
      setToken('');
      setNik('');
      setNotice('Kredensial tersimpan terenkripsi di perangkat.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Kredensial gagal disimpan.');
    } finally {
      setBusy(null);
    }
  }, [nik, token]);

  const removeCredentials = useCallback(() => {
    Alert.alert('Hapus kredensial?', 'Token dan NIK akan dihapus dari penyimpanan terenkripsi.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await clearSecrets();
              setSaved(EMPTY);
              setNotice('Kredensial dihapus.');
            } catch {
              setNotice('Kredensial gagal dihapus.');
            }
          })();
        },
      },
    ]);
  }, []);

  const ask = useCallback(async (kind: PermissionKind, label: string) => {
    const outcome = await ensurePermission(kind);
    if (outcome === 'granted') {
      setSettingsHint(false);
      return true;
    }
    setSettingsHint(outcome === 'blocked');
    setNotice(
      outcome === 'blocked'
        ? `Izin ${label} diblokir. Aktifkan lewat Pengaturan aplikasi.`
        : `Izin ${label} ditolak. Fitur ini butuh izin tersebut.`,
    );
    return false;
  }, []);

  const storeAsset = useCallback(
    async (uri: string, name: string | null | undefined, label: string) => {
      try {
        await importDocument(uri, name ?? undefined);
        refreshDocuments();
        setNotice(`${label} disimpan ke folder aplikasi.`);
      } catch {
        setNotice('Berkas gagal disalin ke penyimpanan aplikasi.');
      }
    },
    [refreshDocuments],
  );

  const takePhoto = useCallback(async () => {
    setNotice(null);
    if (!(await ask('camera', 'kamera'))) return;
    setBusy('camera');
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!result.canceled) {
        await storeAsset(result.assets[0].uri, result.assets[0].fileName, 'Foto');
      }
    } catch {
      setNotice('Kamera tidak dapat dibuka.');
    } finally {
      setBusy(null);
    }
  }, [ask, storeAsset]);

  const pickPhoto = useCallback(async () => {
    setNotice(null);
    // Android memakai photo picker tanpa izin; iOS tetap butuh izin galeri.
    if (Platform.OS === 'ios' && !(await ask('media', 'galeri'))) return;
    setBusy('gallery');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!result.canceled) {
        await storeAsset(result.assets[0].uri, result.assets[0].fileName, 'Gambar');
      }
    } catch {
      setNotice('Galeri tidak dapat dibuka.');
    } finally {
      setBusy(null);
    }
  }, [ask, storeAsset]);

  const pickDocument = useCallback(async () => {
    setNotice(null);
    if (Platform.OS === 'web') {
      setNotice('Pemilih berkas sistem hanya tersedia di Android/iOS.');
      return;
    }
    setBusy('file');
    try {
      // System picker (SAF): tidak butuh izin storage, pengguna memilih berkas sendiri.
      const picked = await File.pickFileAsync();
      if (!picked.canceled) {
        await storeAsset(picked.result.uri, picked.result.name, 'Dokumen');
      }
    } catch {
      setNotice('Pemilih berkas tidak dapat dibuka.');
    } finally {
      setBusy(null);
    }
  }, [storeAsset]);

  const previewDocument = useCallback(async (document: StoredDocument) => {
    try {
      const file = new File(document.uri);
      if (!(await File.canPreview(file))) {
        setNotice('Tidak ada aplikasi yang bisa membuka berkas ini.');
        return;
      }
      await File.preview(file, { title: document.name });
    } catch {
      setNotice('Berkas tidak dapat dibuka.');
    }
  }, []);

  const removeDocument = useCallback(
    (document: StoredDocument) => {
      Alert.alert('Hapus berkas?', document.name, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            try {
              deleteDocument(document.uri);
              refreshDocuments();
              setNotice('Berkas dihapus.');
            } catch {
              setNotice('Berkas gagal dihapus.');
            }
          },
        },
      ]);
    },
    [refreshDocuments],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Data & berkas</Text>
          <Text style={styles.subtitle}>Penyimpanan terenkripsi dan sandbox aplikasi</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {notice && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{notice}</Text>
            {settingsHint && (
              <Pressable onPress={openAppSettings} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Buka Pengaturan</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kredensial terenkripsi</Text>
          <Text style={styles.caption}>
            Token dan NIK disimpan di Keystore/Keychain perangkat, bukan di penyimpanan biasa.
            Nilai tidak ditampilkan penuh setelah tersimpan.
          </Text>

          <Text style={styles.label}>Token sesi</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder={saved.token ? 'Tersimpan · isi untuk mengganti' : 'Belum ada token'}
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            accessibilityLabel="Token sesi"
          />

          <Text style={styles.label}>NIK</Text>
          <TextInput
            style={styles.input}
            value={nik}
            onChangeText={setNik}
            placeholder={saved.nik ? `Tersimpan · ${maskNik(saved.nik)}` : '16 digit NIK'}
            placeholderTextColor={colors.inkFaint}
            keyboardType="number-pad"
            maxLength={16}
            accessibilityLabel="NIK"
          />

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={saveCredentials}
              disabled={busy === 'save'}
              accessibilityRole="button"
            >
              {busy === 'save' ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>Simpan terenkripsi</Text>
              )}
            </Pressable>

            {(saved.token || saved.nik) && (
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={removeCredentials}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Hapus</Text>
              </Pressable>
            )}
          </View>

          {(saved.token || saved.nik) && (
            <Text style={styles.savedText}>
              Tersimpan: {saved.token ? 'token' : '—'} ·{' '}
              {saved.nik ? maskNik(saved.nik) : 'NIK —'}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Dokumen & media</Text>
            <Text style={styles.caption}>{documents.length} berkas</Text>
          </View>
          <Text style={styles.caption}>
            Berkas disalin ke documentDirectory aplikasi (Scoped Storage). Tidak perlu izin
            storage; berkas dari luar dipilih lewat system picker.
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={takePhoto}
              disabled={busy !== null}
              accessibilityRole="button"
            >
              {busy === 'camera' ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>Ambil foto</Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={pickPhoto}
              disabled={busy !== null}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Galeri</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={pickDocument}
              disabled={busy !== null}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Berkas</Text>
            </Pressable>
          </View>

          {busy === 'file' && <ActivityIndicator color={colors.accent} style={styles.inlineLoader} />}

          {documents.length === 0 ? (
            <Text style={[styles.caption, styles.emptyText]}>
              Belum ada berkas. Foto kamera dan dokumen pilihan akan muncul di sini.
            </Text>
          ) : (
            documents.map((document, index) => (
              <View
                key={document.uri}
                style={[styles.docRow, index > 0 && styles.docRowBorder]}
              >
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {document.name}
                  </Text>
                  <Text style={styles.caption}>
                    {formatBytes(document.size)}
                    {document.modifiedAt
                      ? ` · ${new Date(document.modifiedAt).toLocaleDateString('id-ID')}`
                      : ''}
                  </Text>
                </View>
                <Pressable onPress={() => previewDocument(document)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.link}>Buka</Text>
                </Pressable>
                <Pressable onPress={() => removeDocument(document)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.deleteLink}>Hapus</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footnote}>
          Izin diminta saat fitur dipakai: kamera saat mengambil foto, lokasi saat memakai posisi
          perangkat, galeri saat memilih gambar. Setelah ditolak permanen, aktifkan lewat
          Pengaturan.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: space.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  backIcon: { fontSize: 24, lineHeight: 28, fontWeight: '700', color: colors.accent },
  titleBlock: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  subtitle: { fontSize: 11, color: colors.inkFaint, marginTop: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  caption: { fontSize: 12, lineHeight: 17, color: colors.inkFaint },
  label: { fontSize: 12, fontWeight: '600', color: colors.inkMuted, marginTop: space.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minWidth: 92,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 12, fontWeight: '600', color: colors.surface },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkMuted },
  pressed: { opacity: 0.6 },
  savedText: { fontSize: 11, color: colors.inkFaint, marginTop: space.xs },
  notice: {
    borderLeftWidth: 2,
    borderLeftColor: colors.moderate,
    backgroundColor: colors.surface,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    gap: space.xs,
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  link: { fontSize: 12, fontWeight: '600', color: colors.accent },
  deleteLink: { fontSize: 12, fontWeight: '600', color: colors.unhealthy },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  docRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  docInfo: { flex: 1, gap: 2 },
  docName: { fontSize: 13, fontWeight: '500', color: colors.ink },
  emptyText: { marginTop: space.md },
  inlineLoader: { marginTop: space.sm },
  footnote: { fontSize: 11, lineHeight: 16, color: colors.inkFaint },
});
