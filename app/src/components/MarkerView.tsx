import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, radius, spacing } from '../theme';
import type { MarkerPayload } from '../api/types';

/**
 * 크기 기준용 마커. 바깥 테두리는 검출용 쿼드, 안쪽 4x4가 데이터 비트다.
 * 인쇄물과 화면 렌더가 같은 pattern을 쓰므로 항상 일치한다.
 */
export function MarkerView({ pattern, size = 150 }: { pattern: number[][]; size?: number }) {
  const cells = pattern.length;
  const quiet = 1; // 조용한 여백 1셀 — 인식률을 위해 필요
  const total = cells + quiet * 2;
  const unit = size / total;

  return (
    <Svg width={size} height={size}>
      <Rect x={0} y={0} width={size} height={size} fill="#FFFFFF" />
      {pattern.map((row, y) =>
        row.map((bit, x) => (
          <Rect
            key={`${x}-${y}`}
            x={(x + quiet) * unit}
            y={(y + quiet) * unit}
            width={unit}
            height={unit}
            fill={bit ? '#000000' : '#FFFFFF'}
          />
        )),
      )}
    </Svg>
  );
}

/** 화면 2에 보여주는 운송장 미리보기. */
export function WaybillPreview({ marker }: { marker: MarkerPayload }) {
  const { waybill } = marker;
  return (
    <View style={s.sheet}>
      <View style={s.sheetHeader}>
        <Text style={s.brand}>쉽다 공동물류</Text>
        <Text style={s.tracking}>{waybill.tracking_no}</Text>
      </View>

      <View style={s.sheetBody}>
        <View style={s.info}>
          <Row label="상품명" value={waybill.product_name} />
          <Row label="출발" value={waybill.origin} />
          <Row label="도착" value={waybill.destination_country} />
          <Row label="마커 ID" value={marker.marker_id} />
        </View>
        <View style={s.markerBox}>
          <MarkerView pattern={marker.pattern} size={112} />
          <Text style={s.markerCaption}>{marker.marker_size_mm}mm 기준</Text>
        </View>
      </View>

      <View style={s.sheetFooter}>
        <Text style={s.footerText}>
          이 운송장을 실제 크기로 출력해 박스 윗면에 붙여주세요. 마커가 자로 쓰입니다.
        </Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * 인쇄용 HTML. expo-print는 로컬 asset URL을 못 쓰므로 마커를 인라인 SVG로 그린다.
 * mm 단위로 지정해 출력물의 마커 크기가 실제 기준 길이와 일치하게 만든다.
 */
export function waybillHtml(marker: MarkerPayload): string {
  const cells = marker.pattern.length;
  const quiet = 1;
  const total = cells + quiet * 2;
  const unit = marker.marker_size_mm / total;

  const rects = marker.pattern
    .flatMap((row, y) =>
      row.map((bit, x) =>
        bit
          ? `<rect x="${((x + quiet) * unit).toFixed(3)}" y="${((y + quiet) * unit).toFixed(3)}" width="${unit.toFixed(3)}" height="${unit.toFixed(3)}" fill="#000"/>`
          : '',
      ),
    )
    .join('');

  const { waybill } = marker;
  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Malgun Gothic", sans-serif; color: #1A1D21; margin: 0; }
  .sheet { border: 2px solid #1A1D21; border-radius: 3mm; overflow: hidden; }
  .head { display: flex; justify-content: space-between; align-items: center;
          padding: 5mm 6mm; background: #1E3A5C; color: #fff; }
  .brand { font-size: 14pt; font-weight: 700; letter-spacing: .5px; }
  .track { font-size: 11pt; font-family: monospace; }
  .body { display: flex; gap: 6mm; padding: 6mm; }
  .info { flex: 1; }
  .row { display: flex; padding: 2.6mm 0; border-bottom: 1px solid #E4E7EC; }
  .row:last-child { border-bottom: none; }
  .k { width: 24mm; color: #5C6470; font-size: 10pt; }
  .v { flex: 1; font-size: 11.5pt; font-weight: 600; }
  .marker { text-align: center; }
  .cap { font-size: 8.5pt; color: #5C6470; margin-top: 2mm; }
  .foot { padding: 4mm 6mm; background: #F4F5F7; font-size: 9.5pt; color: #5C6470;
          border-top: 1px solid #E4E7EC; }
  .warn { margin-top: 6mm; font-size: 9pt; color: #A96A05; }
</style></head>
<body>
  <div class="sheet">
    <div class="head"><div class="brand">쉽다 공동물류</div><div class="track">${escapeHtml(waybill.tracking_no)}</div></div>
    <div class="body">
      <div class="info">
        <div class="row"><div class="k">상품명</div><div class="v">${escapeHtml(waybill.product_name)}</div></div>
        <div class="row"><div class="k">출발</div><div class="v">${escapeHtml(waybill.origin)}</div></div>
        <div class="row"><div class="k">도착</div><div class="v">${escapeHtml(waybill.destination_country)}</div></div>
        <div class="row"><div class="k">마커 ID</div><div class="v">${escapeHtml(marker.marker_id)}</div></div>
      </div>
      <div class="marker">
        <svg width="${marker.marker_size_mm}mm" height="${marker.marker_size_mm}mm"
             viewBox="0 0 ${marker.marker_size_mm} ${marker.marker_size_mm}">
          <rect width="${marker.marker_size_mm}" height="${marker.marker_size_mm}" fill="#fff"/>
          ${rects}
        </svg>
        <div class="cap">${marker.marker_size_mm}mm × ${marker.marker_size_mm}mm</div>
      </div>
    </div>
    <div class="foot">이 운송장을 박스 윗면에 붙인 뒤 앱에서 촬영하세요. 마커가 크기 기준자 역할을 합니다.</div>
  </div>
  <div class="warn">※ 인쇄 시 '실제 크기(100%)'로 출력해야 합니다. '용지에 맞춤'으로 인쇄하면 치수가 어긋납니다.</div>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const s = StyleSheet.create({
  sheet: {
    borderWidth: 1.6,
    borderColor: colors.text,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.navy,
  },
  brand: { color: colors.onNavy, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  tracking: { color: colors.onNavySub, fontSize: 12, fontVariant: ['tabular-nums'] },

  sheetBody: { flexDirection: 'row', gap: spacing.lg, padding: spacing.lg },
  info: { flex: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { width: 58, fontSize: 12, color: colors.textSub },
  rowValue: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },

  markerBox: { alignItems: 'center', justifyContent: 'center' },
  markerCaption: { fontSize: 10.5, color: colors.textMuted, marginTop: 5 },

  sheetFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { fontSize: 11.5, color: colors.textSub, lineHeight: 17 },
});
