import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { colors, radius } from '../theme';
import type { AdminOverview, AdminRoutes } from '../api/types';

export const REGION_COLORS: Record<string, string> = {
  광주권: '#2C5182',
  동부권: '#2E9E6B',
  서부권: '#E09A26',
  전체: '#2C5182',
};

/**
 * 광주·전남 지도. 지도 API 없이 위경도를 등장방형(equirectangular)으로 투영해 그린다.
 * 원 크기는 화물량, 색은 권역이다.
 */
export function RegionMap({
  overview,
  routes,
  width,
  height,
  showRoutes,
}: {
  overview: AdminOverview;
  routes?: AdminRoutes | null;
  width: number;
  height: number;
  showRoutes: boolean;
}) {
  const pad = 16;
  const { min_lat, max_lat, min_lng, max_lng } = overview.bounds;

  // 위도에 따른 경도 축소를 반영해 가로세로 비율을 맞춘다
  const latSpan = max_lat - min_lat;
  const lngSpan = max_lng - min_lng;
  const midLat = (min_lat + max_lat) / 2;
  const lngScale = Math.cos((midLat * Math.PI) / 180);

  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const scale = Math.min(innerW / (lngSpan * lngScale), innerH / latSpan);
  const offsetX = pad + (innerW - lngSpan * lngScale * scale) / 2;
  const offsetY = pad + (innerH - latSpan * scale) / 2;

  const project = (lat: number, lng: number) => ({
    x: offsetX + (lng - min_lng) * lngScale * scale,
    y: offsetY + (max_lat - lat) * scale,
  });

  const maxCargo = Math.max(...overview.markets.map((m) => m.cargo_count));

  return (
    <View style={[s.wrap, { width, height }]}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill="#EEF2F7" rx={radius.md} />

        {/* 격자 — 지도 배경 느낌만 준다 */}
        <G opacity={0.5}>
          {[0.25, 0.5, 0.75].map((f) => (
            <React.Fragment key={f}>
              <Line x1={width * f} y1={0} x2={width * f} y2={height} stroke="#DCE3EC" strokeWidth={1} />
              <Line x1={0} y1={height * f} x2={width} y2={height * f} stroke="#DCE3EC" strokeWidth={1} />
            </React.Fragment>
          ))}
        </G>

        {/* 집하 경로 */}
        {showRoutes && routes
          ? routes.routes.map((route) => {
              const depot = project(route.depot.lat, route.depot.lng);
              const color = REGION_COLORS[route.region] ?? colors.navy;
              const d = route.stops
                .map((stop) => {
                  const p = project(stop.lat, stop.lng);
                  return `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
                })
                .join(' ');
              return (
                <Path
                  key={route.region}
                  d={`M ${depot.x.toFixed(1)} ${depot.y.toFixed(1)} ${d} L ${depot.x.toFixed(1)} ${depot.y.toFixed(1)}`}
                  stroke={color}
                  strokeWidth={1.3}
                  strokeOpacity={0.55}
                  fill="none"
                  strokeLinejoin="round"
                />
              );
            })
          : null}

        {/* 전통시장 — 원 크기가 화물량 */}
        {overview.markets.map((market) => {
          const p = project(market.lat, market.lng);
          const r = 2.6 + (market.cargo_count / maxCargo) * 6.2;
          const color = REGION_COLORS[market.region] ?? colors.navy;
          return (
            <Circle
              key={market.id}
              cx={p.x}
              cy={p.y}
              r={r}
              fill={color}
              fillOpacity={0.5}
              stroke={color}
              strokeWidth={1.1}
            />
          );
        })}

        {/* 권역 집하소 */}
        {overview.regions.map((region) => {
          const p = project(region.depot.lat, region.depot.lng);
          const color = REGION_COLORS[region.region] ?? colors.navy;
          return (
            <G key={region.region}>
              <Rect
                x={p.x - 7}
                y={p.y - 7}
                width={14}
                height={14}
                rx={3}
                fill={color}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              <SvgText
                x={p.x}
                y={p.y - 12}
                fill={color}
                fontSize={10}
                fontWeight="700"
                textAnchor="middle"
              >
                {region.region}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
