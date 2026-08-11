import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors, radius, spacing } from '../theme';

/**
 * 촬영 허용 각도. 0=수평, 90=수직 내려다보기.
 * 바닥에 놓인 박스를 서서 내려다보면 60~70도쯤이 자연스럽다.
 */
export const ANGLE_MIN = 60;
export const ANGLE_MAX = 70;

export function isAngleValid(angle: number): boolean {
  return angle >= ANGLE_MIN && angle <= ANGLE_MAX;
}

const W = 220;
const H = 132;
const CX = W / 2;
const CY = 118;
const R = 92;

/** 각도(0~90도)를 반원 게이지 위의 좌표로. 0도=왼쪽, 90도=오른쪽. */
function polar(angleDeg: number, radius: number) {
  const clamped = Math.max(0, Math.min(90, angleDeg));
  const rad = ((180 - clamped * 2) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

function arcPath(from: number, to: number, radius: number) {
  const a = polar(from, radius);
  const b = polar(to, radius);
  const large = Math.abs(to - from) * 2 > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
}

/**
 * 촬영 각도 수평계.
 * 30~40도 구간에 들어오면 초록, 벗어나면 빨강으로 바뀐다. (기능명세서 3.4)
 */
export function AngleGauge({ angle, active }: { angle: number; active: boolean }) {
  const ok = isAngleValid(angle);
  const tone = !active ? colors.textMuted : ok ? colors.successAccent : colors.dangerAccent;
  const needle = polar(angle, R - 10);
  const hint = !active
    ? '기기를 기울여 각도를 맞춰주세요'
    : ok
      ? '각도가 맞았어요'
      : angle < ANGLE_MIN
        ? '조금 더 위에서 (기기를 더 눕혀주세요)'
        : '조금 더 낮게 (기기를 더 세워주세요)';

  return (
    <View style={s.wrap}>
      <Svg width={W} height={H}>
        {/* 전체 범위 */}
        <Path d={arcPath(0, 90, R)} stroke="rgba(255,255,255,0.28)" strokeWidth={11} fill="none" strokeLinecap="round" />
        {/* 목표 구간 30~40도 */}
        <Path d={arcPath(ANGLE_MIN, ANGLE_MAX, R)} stroke={tone} strokeWidth={11} fill="none" strokeLinecap="round" />

        {/* 눈금 */}
        <G>
          {[0, 30, ANGLE_MIN, ANGLE_MAX, 90].map((tick) => {
            const outer = polar(tick, R + 10);
            const inner = polar(tick, R + 3);
            return (
              <Line
                key={tick}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={1.6}
              />
            );
          })}
        </G>
        <SvgText
          x={polar(ANGLE_MIN, R + 22).x}
          y={polar(ANGLE_MIN, R + 22).y}
          fill="rgba(255,255,255,0.75)"
          fontSize={10}
          textAnchor="middle"
        >
          {ANGLE_MIN}°
        </SvgText>
        <SvgText
          x={polar(ANGLE_MAX, R + 22).x}
          y={polar(ANGLE_MAX, R + 22).y}
          fill="rgba(255,255,255,0.75)"
          fontSize={10}
          textAnchor="middle"
        >
          {ANGLE_MAX}°
        </SvgText>

        {/* 바늘 */}
        <Line x1={CX} y1={CY} x2={needle.x} y2={needle.y} stroke={tone} strokeWidth={3.4} strokeLinecap="round" />
        <Circle cx={CX} cy={CY} r={7} fill={tone} />
        <Circle cx={CX} cy={CY} r={3} fill="#0B1B2E" />
      </Svg>

      <View style={s.readout}>
        <Text style={[s.angleText, { color: tone }]}>{active ? `${Math.round(angle)}°` : '--°'}</Text>
        <Text style={s.hint}>{hint}</Text>
      </View>
    </View>
  );
}

/** 각도가 맞았는지 알려주는 촬영 프레임 오버레이. */
export function CaptureFrame({ locked, label = '각도 맞음' }: { locked: boolean; label?: string }) {
  const tone = locked ? colors.successAccent : 'rgba(255,255,255,0.55)';
  return (
    <View pointerEvents="none" style={s.frame}>
      <View style={[s.corner, s.cornerTL, { borderColor: tone }]} />
      <View style={[s.corner, s.cornerTR, { borderColor: tone }]} />
      <View style={[s.corner, s.cornerBL, { borderColor: tone }]} />
      <View style={[s.corner, s.cornerBR, { borderColor: tone }]} />
      {locked ? (
        <View style={s.lockBadge}>
          <Text style={s.lockText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
  readout: { alignItems: 'center', marginTop: -18 },
  angleText: { fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 3, textAlign: 'center' },

  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: spacing.xxl,
    justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 40, height: 40, borderWidth: 3.5 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: radius.md },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: radius.md },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: radius.md },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: radius.md },
  lockBadge: {
    alignSelf: 'center',
    backgroundColor: colors.successAccent,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  lockText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
