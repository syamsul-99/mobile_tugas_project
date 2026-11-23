import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/constants/design';
import { REPORT_CATEGORIES } from '@/constants/reportCategories';
import type { ReportWithDistance } from '@/types/report';
import { formatDistance } from '@/utils/haversine';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatReportedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} · ${time}`;
}

interface Props {
  report: ReportWithDistance;
  onClose: () => void;
}

export default function ReportCallout({ report, onClose }: Props) {
  const meta = REPORT_CATEGORIES[report.category];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: meta.color }]} />
          <Text style={styles.badgeText}>{meta.label}</Text>
        </View>
        <Text style={styles.group}>{meta.group === 'bencana' ? 'Bencana' : 'Infrastruktur'}</Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Tutup detail laporan"
        >
          <Text style={styles.close}>Tutup</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{report.title}</Text>
      <Text style={styles.description}>{report.description}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Jarak lurus</Text>
          <Text style={styles.metaValue}>{formatDistance(report.distanceM)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Koordinat</Text>
          <Text style={styles.metaValue}>
            {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Dilaporkan</Text>
          <Text style={styles.metaValue}>{formatReportedAt(report.reportedAt)}</Text>
        </View>
      </View>

      {report.isSample && (
        <Text style={styles.sample}>
          Data contoh untuk demonstrasi. Bukan laporan warga sungguhan.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  group: { flex: 1, fontSize: 11, color: colors.inkFaint },
  close: { fontSize: 12, fontWeight: '600', color: colors.accent },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink, lineHeight: 22 },
  description: { fontSize: 13, lineHeight: 19, color: colors.inkMuted },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: space.md,
    marginTop: space.xs,
  },
  metaItem: { minWidth: 96, gap: 2 },
  metaLabel: { fontSize: 10, color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue: { fontSize: 12, color: colors.ink, fontVariant: ['tabular-nums'] },
  sample: { fontSize: 10, lineHeight: 15, color: colors.inkFaint, marginTop: space.xs },
});
