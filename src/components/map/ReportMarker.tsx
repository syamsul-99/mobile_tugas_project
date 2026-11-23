import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { REPORT_CATEGORIES } from '@/constants/reportCategories';
import { colors } from '@/constants/design';
import type { Report } from '@/types/report';

interface Props {
  report: Report;
  selected: boolean;
  onPress: (report: Report) => void;
}

/**
 * Marker kustom: lingkaran untuk bencana, kotak untuk infrastruktur.
 * Bentuk + warna membawa makna, bukan dekorasi.
 */
function ReportMarkerBase({ report, selected, onPress }: Props) {
  const meta = REPORT_CATEGORIES[report.category];

  return (
    <Marker
      coordinate={{ latitude: report.latitude, longitude: report.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={selected}
      zIndex={selected ? 2 : 1}
      onPress={() => onPress(report)}
      accessibilityLabel={`${meta.label}: ${report.title}`}
    >
      <View
        style={[
          styles.pin,
          { backgroundColor: meta.color, borderRadius: meta.group === 'bencana' ? 13 : 4 },
          selected && styles.selected,
        ]}
      >
        <View style={styles.dot} />
      </View>
    </Marker>
  );
}

export default memo(ReportMarkerBase);

const styles = StyleSheet.create({
  pin: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  selected: {
    borderColor: colors.ink,
    transform: [{ scale: 1.2 }],
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surface },
});
