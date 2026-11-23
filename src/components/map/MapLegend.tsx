import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/constants/design';
import { REPORT_CATEGORIES } from '@/constants/reportCategories';
import type { ReportCategory } from '@/types/report';

const CATEGORIES = Object.keys(REPORT_CATEGORIES) as ReportCategory[];

/** Legenda kategori. Bentuk mengikuti marker: lingkaran bencana, kotak infrastruktur. */
export default function MapLegend() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
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
  );
}

const styles = StyleSheet.create({
  row: { gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10 },
  label: { fontSize: 11, color: colors.inkMuted },
});
