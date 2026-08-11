import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

/** 등록 플로우 상단의 진행 단계 표시. */
export const FLOW_STEPS = ['상품', '운송장', '체적', '성분', 'HS Code', '완료'] as const;

export function StepBar({ current }: { current: number }) {
  return (
    <View style={s.wrap}>
      <View style={s.track}>
        {FLOW_STEPS.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <View key={label} style={s.segment}>
              <View style={[s.bar, (done || active) && s.barActive, done && s.barDone]} />
              <Text style={[s.label, active && s.labelActive, done && s.labelDone]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  track: { flexDirection: 'row', gap: 5 },
  segment: { flex: 1, gap: 5 },
  bar: { height: 3.5, borderRadius: radius.pill, backgroundColor: colors.border },
  barActive: { backgroundColor: colors.navy },
  barDone: { backgroundColor: colors.successAccent },
  label: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  labelActive: { color: colors.navy, fontWeight: '700' },
  labelDone: { color: colors.successFg, fontWeight: '600' },
});
