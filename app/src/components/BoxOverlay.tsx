import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

import { colors } from '../theme';
import type { CbmOverlay, Point } from '../api/types';

/**
 * 촬영 이미지 위에 박스 윤곽선과 마커 테두리를 겹쳐 그린다.
 * 좌표는 0~1로 정규화되어 오므로 컨테이너 크기에 곱해 쓴다.
 */
export function BoxOverlay({
  overlay,
  width,
  height,
}: {
  overlay: CbmOverlay;
  width: number;
  height: number;
}) {
  const px = (p: Point): Point => [p[0] * width, p[1] * height];
  const top = overlay.box_top.map(px);
  const bottom = overlay.box_bottom.map(px);
  const marker = overlay.marker.map(px);

  const poly = (pts: Point[]) => pts.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {/* 마커 — 인식된 기준자 */}
        <Polygon
          points={poly(marker)}
          fill="rgba(46,158,107,0.22)"
          stroke={colors.successAccent}
          strokeWidth={2.4}
        />

        {/* 뒤쪽 아랫면 — 가려진 모서리라 점선 */}
        <Polygon
          points={poly(bottom)}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={1.6}
          strokeDasharray="6 5"
        />

        {/* 수직 모서리 */}
        {top.map((p, i) => (
          <Line
            key={`edge-${i}`}
            x1={p[0]}
            y1={p[1]}
            x2={bottom[i][0]}
            y2={bottom[i][1]}
            stroke={colors.warnAccent}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        ))}

        {/* 윗면 */}
        <Polygon
          points={poly(top)}
          fill="rgba(224,154,38,0.14)"
          stroke={colors.warnAccent}
          strokeWidth={2.8}
          strokeLinejoin="round"
        />

        {/* 꼭짓점 */}
        {top.map((p, i) => (
          <Circle key={`v-${i}`} cx={p[0]} cy={p[1]} r={5} fill={colors.warnAccent} stroke="#FFFFFF" strokeWidth={1.6} />
        ))}
      </Svg>
    </View>
  );
}
