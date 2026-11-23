import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { colors } from '@/constants/design';

interface Props {
  latitude: number;
  longitude: number;
  /** true bila koordinat berasal dari simulasi, bukan GPS. */
  simulated?: boolean;
}

/** Posisi pengguna: titik biru dengan halo, berbeda dari marker laporan. */
function UserLocationMarkerBase({ latitude, longitude, simulated = false }: Props) {
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      flat
      accessibilityLabel={simulated ? 'Lokasi simulasi' : 'Lokasi pengguna'}
    >
      <View style={[styles.halo, simulated && styles.haloSimulated]}>
        <View style={styles.dot} />
      </View>
    </Marker>
  );
}

export default memo(UserLocationMarkerBase);

const styles = StyleSheet.create({
  halo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(27,77,143,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloSimulated: { backgroundColor: 'rgba(90,100,114,0.24)' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
