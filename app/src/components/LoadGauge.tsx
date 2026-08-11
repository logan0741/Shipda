import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

const TARGET_RATIO = 80;

/** 컨테이너 적재율 게이지. 목표 적재율 80% 지점에 눈금을 둔다. */
export function LoadGauge({
  ratio,
  loadedCbm,
  capacityCbm,
  myCbm,
}: {
  ratio: number;
  loadedCbm: number;
  capacityCbm: number;
  myCbm?: number | null;
}) {
  const clamped = Math.max(0, Math.min(100, ratio));
  const reached = clamped >= TARGET_RATIO;
  const tone = reached ? colors.successAccent : colors.warnAccent;
  const myRatio = myCbm ? Math.max(1.2, (myCbm / capacityCbm) * 100) : 0;

  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Text style={s.ratio}>
          {clamped}
          <Text style={s.ratioUnit}>%</Text>
        </Text>
        <Text style={s.volume}>
          {loadedCbm} / {capacityCbm} CBM
        </Text>
      </View>

      <View style={s.track}>
        <View style={[s.fill, { width: `${clamped}%`, backgroundColor: tone }]} />
        {myRatio > 0 ? (
          <View style={[s.mine, { left: `${Math.max(0, clamped - myRatio)}%`, width: `${myRatio}%` }]} />
        ) : null}
        <View style={[s.targetLine, { left: `${TARGET_RATIO}%` }]} />
      </View>

      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: tone }]} />
          <Text style={s.legendText}>적재된 화물</Text>
        </View>
        {myCbm ? (
          <View style={s.legendItem}>
            <View style={[s.dot, s.dotMine]} />
            <Text style={s.legendText}>내 화물 {myCbm} CBM</Text>
          </View>
        ) : null}
        <View style={s.legendItem}>
          <View style={s.targetChip} />
          <Text style={s.legendText}>목표 {TARGET_RATIO}%</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  ratio: { fontSize: 36, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  ratioUnit: { fontSize: 19, fontWeight: '700', color: colors.textSub },
  volume: { fontSize: 13, color: colors.textSub, fontWeight: '600', marginBottom: 6 },

  track: {
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  mine: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.navy },
  targetLine: { position: 'absolute', top: -2, bottom: -2, width: 2.4, backgroundColor: colors.text },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  dotMine: { backgroundColor: colors.navy },
  targetChip: { width: 2.6, height: 12, backgroundColor: colors.text },
  legendText: { fontSize: 11.5, color: colors.textSub },
});
