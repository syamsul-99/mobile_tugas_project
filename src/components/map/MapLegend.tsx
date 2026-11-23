import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/constants/design';
import { REPORT_CATEGORIES } from '@/constants/reportCategories';
import type { ReportCategory } from '@/types/report';

const CATEGORIES = Object.keys(REPORT_CATEGORIES) as ReportCategory[];

/** Legenda kategori. Bentuk mengikuti marker: lingkaran bencana, kotak infrastruktur. */
export default function MapLegend() {
  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
        accessibilityLabel="Legenda kategori laporan"
      >
        {CATEGORIES.map((category) => {
          const meta = REPORT_CATEGORIES[category];
          return (
            <View key={category} style={styles.item}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: meta.color,
                    borderRadius: meta.group === 'bencana' ? 5 : 2,
                  },
                ]}
              />
              <Text style={styles.label}>{meta.label}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ScrollView default-nya flexGrow:1; tanpa ini legenda menelan tinggi layar.
  bar: {
    flexGrow: 0,
    height: 46,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  scroll: { flexGrow: 0 },
  row: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  swatch: { width: 9, height: 9 },
  label: { fontSize: 11, fontWeight: '500', color: colors.inkMuted },
});
