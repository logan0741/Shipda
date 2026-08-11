import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, statusTheme, type HsStatus } from '../theme';
import type { HsCodeParts } from '../api/types';

/**
 * HS Code를 호 / 소호 / 국내세분으로 분해해 보여준다.
 * 시연 시나리오 화면 5의 표현을 그대로 옮긴 것.
 */
export function HsCodeDisplay({
  parts,
  formatted,
  status,
  confidence,
}: {
  parts: HsCodeParts | null;
  formatted: string | null;
  status: HsStatus;
  confidence: number | null;
}) {
  const tone = statusTheme(status);

  if (!parts) {
    return (
      <View style={[s.card, { backgroundColor: tone.bg }]}>
        <Text style={[s.noCode, { color: tone.fg }]}>판정된 HS Code 없음</Text>
        <View style={[s.statusPill, { backgroundColor: tone.fg }]}>
          <Text style={s.statusPillText}>{tone.label}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.card, { backgroundColor: tone.bg }]}>
      <View style={s.codeRow}>
        <Segment value={parts.heading} caption={'호\n국제 공통'} tone={tone.fg} />
        <Text style={[s.sep, { color: tone.fg }]}>.</Text>
        <Segment value={parts.subheading} caption={'소호\n국제 공통'} tone={tone.fg} />
        <Text style={[s.sep, { color: tone.fg }]}>-</Text>
        <Segment value={parts.national} caption={'국내세분\n관세청 신고'} tone={tone.fg} />
      </View>

      <View style={s.footer}>
        <View style={[s.statusPill, { backgroundColor: tone.fg }]}>
          <Text style={s.statusPillText}>{tone.label}</Text>
        </View>
        {confidence != null ? (
          <View style={s.confidence}>
            <Text style={[s.confidenceText, { color: tone.fg }]}>신뢰도 {Math.round(confidence * 100)}%</Text>
            <View style={s.confidenceTrack}>
              <View
                style={[s.confidenceFill, { width: `${Math.round(confidence * 100)}%`, backgroundColor: tone.fg }]}
              />
            </View>
          </View>
        ) : null}
      </View>

      {formatted ? <Text style={[s.plain, { color: tone.fg }]}>{formatted}</Text> : null}
    </View>
  );
}

function Segment({ value, caption, tone }: { value: string; caption: string; tone: string }) {
  return (
    <View style={s.segment}>
      <Text style={[s.segmentValue, { color: tone }]}>{value}</Text>
      <Text style={[s.segmentCaption, { color: tone }]}>{caption}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  codeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 2 },
  segment: { alignItems: 'center', paddingHorizontal: 2 },
  segmentValue: { fontSize: 30, fontWeight: '800', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  segmentCaption: { fontSize: 9.5, textAlign: 'center', lineHeight: 13, marginTop: 3, opacity: 0.8 },
  sep: { fontSize: 28, fontWeight: '800', marginTop: 1 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  statusPillText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },

  confidence: { flex: 1, gap: 4 },
  confidenceText: { fontSize: 11.5, fontWeight: '600' },
  confidenceTrack: { height: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.6)', overflow: 'hidden' },
  confidenceFill: { height: 5, borderRadius: radius.pill },

  plain: { fontSize: 12, textAlign: 'center', opacity: 0.7, fontVariant: ['tabular-nums'] },
  noCode: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
