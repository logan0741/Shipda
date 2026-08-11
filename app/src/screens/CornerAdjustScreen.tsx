import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { api, ApiError } from '../api/client';
import { Analyzing } from '../components/Analyzing';
import { AppHeader, Banner, Body, Button, Footer, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Corner = { x: number; y: number };

const INITIAL: Corner[] = [
  { x: 0.28, y: 0.34 },
  { x: 0.72, y: 0.3 },
  { x: 0.84, y: 0.46 },
  { x: 0.36, y: 0.52 },
];

const LABELS = ['①', '②', '③', '④'];

/**
 * 박스 모서리가 가려져 자동 검출이 실패했을 때 쓰는 수동 보정 화면.
 * 사용자가 윗면 네 모서리를 직접 지정하면 그 값으로 다시 계산한다. (기능명세서 3.4)
 */
export default function CornerAdjustScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, boxPhotoUri, patch } = useFlow();

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [corners, setCorners] = useState<Corner[]>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PanResponder 안에서 최신 값을 읽기 위한 ref
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const cornersRef = useRef(corners);
  cornersRef.current = corners;
  // 드래그를 시작한 순간의 위치. 이동 중에는 고정되어야 한다.
  const dragStartRef = useRef<Corner>({ x: 0, y: 0 });

  const responders = useMemo(
    () =>
      INITIAL.map((_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            dragStartRef.current = cornersRef.current[index];
          },
          onPanResponderMove: (_evt, gesture) => {
            const { width, height } = sizeRef.current;
            if (!width || !height) return;
            const start = dragStartRef.current;
            setCorners((prev) => {
              const next = [...prev];
              next[index] = {
                x: clamp(start.x + gesture.dx / width),
                y: clamp(start.y + gesture.dy / height),
              };
              return next;
            });
          },
        }),
      ),
    [],
  );

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }

  async function recalculate() {
    if (!productId || !boxPhotoUri) return;
    setBusy(true);
    setError(null);
    try {
      // 보정한 모서리를 반영해 다시 계산한다 (mock 서버는 고정 치수를 돌려준다)
      const result = await api.predictCbm(productId, boxPhotoUri, 35, null);
      if (result.success && result.dimensions) {
        patch({ dimensions: result.dimensions, boxOverlay: result.overlay ?? null });
        navigation.replace('CbmResult');
        return;
      }
      setError(result.message ?? '다시 계산하지 못했습니다.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '다시 계산하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Analyzing
          title="보정한 모서리로 다시 계산 중"
          steps={['지정한 모서리 반영 중', '치수 재계산 중']}
        />
      </Screen>
    );
  }

  const points = corners.map((c) => `${c.x * size.width},${c.y * size.height}`).join(' ');

  return (
    <Screen>
      <AppHeader title="모서리 직접 지정" onBack={() => navigation.goBack()} />

      <Body>
        <Banner
          tone="warn"
          title="박스 모서리 일부가 가려졌어요"
          message="박스 윗면의 네 모서리를 손가락으로 끌어서 맞춰주세요."
        />

        <View style={s.canvas} onLayout={handleLayout}>
          {boxPhotoUri ? (
            <Image source={{ uri: boxPhotoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, s.noPhoto]}>
              <Text style={s.noPhotoText}>촬영된 사진이 없습니다</Text>
            </View>
          )}

          {size.width > 0 ? (
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <Polygon
                points={points}
                fill="rgba(224,154,38,0.18)"
                stroke={colors.warnAccent}
                strokeWidth={2.6}
                strokeLinejoin="round"
              />
              {corners.map((c, i) => (
                <Circle
                  key={i}
                  cx={c.x * size.width}
                  cy={c.y * size.height}
                  r={7}
                  fill={colors.warnAccent}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              ))}
            </Svg>
          ) : null}

          {size.width > 0
            ? corners.map((c, i) => (
                <View
                  key={i}
                  {...responders[i].panHandlers}
                  style={[
                    s.handle,
                    { left: c.x * size.width - 24, top: c.y * size.height - 24 },
                  ]}
                >
                  <Text style={s.handleLabel}>{LABELS[i]}</Text>
                </View>
              ))
            : null}
        </View>

        {error ? <Banner tone="danger" title="계산 실패" message={error} icon="alert-circle" /> : null}

        <Text style={s.hint}>
          ①②③④ 손잡이를 박스 윗면의 네 모서리에 정확히 올려주세요. 순서는 시계 방향입니다.
        </Text>
      </Body>

      <Footer>
        <Button label="처음 위치로" variant="secondary" icon="refresh" onPress={() => setCorners(INITIAL)} />
        <Button label="이 모서리로 계산" onPress={recalculate} />
      </Footer>
    </Screen>
  );
}

function clamp(v: number): number {
  return Math.max(0.02, Math.min(0.98, v));
}

const s = StyleSheet.create({
  canvas: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0B1B2E',
  },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  noPhotoText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  handle: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 3,
    marginTop: 24,
  },

  hint: { fontSize: 12.5, color: colors.textSub, lineHeight: 19 },
});
