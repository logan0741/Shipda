import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { DeviceMotion } from 'expo-sensors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import { Analyzing } from '../components/Analyzing';
import { ANGLE_MAX, ANGLE_MIN, AngleGauge, CaptureFrame, isAngleValid } from '../components/AngleGauge';
import { Icon } from '../components/Icon';
import { AppHeader, Banner, Button, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { useSettings } from '../state/SettingsContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ANALYZE_STEPS = ['사진 인식 중', '마커 검출 중', '박스 모서리 추정 중', '체적 계산 중'];

/**
 * 기기 기울기에서 뒷면 카메라가 아래를 보는 각도(0=수평, 90=수직 내려다보기)를 구한다.
 *
 * 폰을 눕혀 카메라가 바닥을 향할 때 중력의 z 성분은 음수로 들어온다.
 * 부호를 뒤집어야 "내려다볼수록 +"가 되어 허용 각도 구간이 바닥 쪽을 가리킨다.
 */
function tiltFromGravity(g: { x: number; y: number; z: number } | null | undefined): number | null {
  if (!g) return null;
  const magnitude = Math.hypot(g.x, g.y, g.z);
  if (!magnitude) return null;
  const ratio = Math.max(-1, Math.min(1, -g.z / magnitude));
  return (Math.asin(ratio) * 180) / Math.PI;
}

export default function BoxCaptureScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, patch } = useFlow();
  const { enforceAngle, cbmForceError } = useSettings();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [angle, setAngle] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    DeviceMotion.setUpdateInterval(120);
    subscription = DeviceMotion.addListener((data) => {
      const tilt = tiltFromGravity(data.accelerationIncludingGravity);
      if (tilt != null) setAngle(tilt);
    });
    return () => subscription?.remove();
  }, []);

  const angleOk = angle != null && isAngleValid(angle);
  const canCapture = !busy && (!enforceAngle || angleOk);

  const capture = useCallback(async () => {
    if (!productId || !cameraRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) throw new Error('사진을 저장하지 못했습니다.');

      const fallbackAngle = (ANGLE_MIN + ANGLE_MAX) / 2;
      const result = await api.predictCbm(productId, photo.uri, angle ?? fallbackAngle, cbmForceError);
      patch({ boxPhotoUri: photo.uri, boxOverlay: result.overlay ?? null });

      if (result.success && result.dimensions) {
        patch({ dimensions: result.dimensions });
        navigation.replace('CbmResult');
        return;
      }

      // 모서리가 가려진 경우엔 수동 보정 화면으로 보낸다
      if (result.action === 'manual_corners') {
        navigation.replace('CornerAdjust');
        return;
      }

      const suffix = result.suggest_manual
        ? '\n\n계속 인식되지 않으면 아래 [직접 입력하기]를 이용해주세요.'
        : '';
      setError(`${result.message ?? '측정에 실패했습니다.'}\n${result.guidance ?? ''}${suffix}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '측정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }, [productId, angle, cbmForceError, patch, navigation]);

  if (busy) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Analyzing steps={ANALYZE_STEPS} />
      </Screen>
    );
  }

  if (!permission) {
    return (
      <Screen>
        <AppHeader title="박스 촬영" onBack={() => navigation.goBack()} />
        <View style={s.permission}>
          <Text style={s.permissionText}>카메라 상태를 확인하고 있어요…</Text>
        </View>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <AppHeader title="박스 촬영" onBack={() => navigation.goBack()} />
        <View style={s.permission}>
          <Icon name="camera" size={40} color={colors.textMuted} />
          <Text style={s.permissionTitle}>카메라 권한이 필요합니다</Text>
          <Text style={s.permissionText}>
            박스를 촬영해 체적을 계산합니다. 사진은 서버로 전송된 뒤 저장하지 않습니다.
          </Text>
          <Button label="카메라 권한 허용" onPress={requestPermission} style={s.permissionBtn} />
          <Button
            label="직접 입력하기"
            variant="secondary"
            onPress={() => navigation.navigate('CbmManual')}
            style={s.permissionBtn}
          />
        </View>
      </Screen>
    );
  }

  return (
    <View style={s.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <Screen style={s.overlayScreen} edges={['top', 'bottom']}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={s.topTitle}>박스 촬영</Text>
          <View style={s.topSpacer} />
        </View>

        <CaptureFrame locked={angleOk} />

        <View style={s.bottom}>
          {error ? (
            <View style={s.errorWrap}>
              <Banner tone="warn" title={error.split('\n')[0]} message={error.split('\n').slice(1).join('\n').trim()} />
              <Button
                label="직접 입력하기"
                variant="secondary"
                onPress={() => navigation.navigate('CbmManual')}
              />
            </View>
          ) : null}

          <AngleGauge angle={angle ?? 0} active={angle != null} />

          <Text style={s.guide}>박스 전체와 운송장이 함께 보이게 찍어주세요</Text>

          <View style={s.shutterRow}>
            <Pressable
              onPress={() => navigation.navigate('CbmManual')}
              style={s.sideAction}
              hitSlop={10}
            >
              <Icon name="edit" size={20} color="#FFFFFF" />
              <Text style={s.sideText}>직접 입력</Text>
            </Pressable>

            <Pressable
              onPress={capture}
              disabled={!canCapture}
              style={[s.shutter, !canCapture && s.shutterDisabled]}
            >
              <View style={[s.shutterInner, !canCapture && s.shutterInnerDisabled]} />
            </Pressable>

            <View style={s.sideAction} />
          </View>

          {!canCapture ? (
            <Text style={s.blockedText}>
              각도가 {ANGLE_MIN}~{ANGLE_MAX}도에 들어와야 촬영할 수 있어요
            </Text>
          ) : null}
        </View>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  overlayScreen: { backgroundColor: 'transparent' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topTitle: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  topSpacer: { width: 26 },

  bottom: {
    marginTop: 'auto',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    backgroundColor: 'rgba(11,27,46,0.72)',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  errorWrap: { gap: spacing.sm, marginBottom: spacing.xs },


  guide: { color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center' },

  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideAction: { width: 74, alignItems: 'center', gap: 4 },
  sideText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '600' },

  shutter: {
    width: 74,
    height: 74,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { borderColor: 'rgba(255,255,255,0.4)' },
  shutterInner: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: '#FFFFFF' },
  shutterInnerDisabled: { backgroundColor: 'rgba(255,255,255,0.4)' },

  blockedText: { color: colors.warnAccent, fontSize: 12, textAlign: 'center', fontWeight: '600' },

  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  permissionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  permissionText: { fontSize: 13.5, color: colors.textSub, textAlign: 'center', lineHeight: 20 },
  permissionBtn: { alignSelf: 'stretch', marginTop: spacing.sm },
});
