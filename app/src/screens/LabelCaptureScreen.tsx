import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import { Analyzing } from '../components/Analyzing';
import { Icon } from '../components/Icon';
import { AppHeader, Banner, Button, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { useSettings } from '../state/SettingsContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ANALYZE_STEPS = ['사진 인식 중', '원재료·함량 추출 중', 'HS Code 후보 탐색 중', '관세율표 대조 중'];

export default function LabelCaptureScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, patch } = useFlow();
  const { hsForceError } = useSettings();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    if (!productId || !cameraRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) throw new Error('사진을 저장하지 못했습니다.');
      patch({ labelPhotoUri: photo.uri });

      const result = await api.predictHsCode(productId, photo.uri, hsForceError);

      if (!result.success || result.action === 'manual_input') {
        // 기능명세서 3.3 — 텍스트 인식 실패 시 직접 입력 화면으로 전환
        navigation.replace('IngredientManual');
        return;
      }
      if (result.hscode_result) {
        patch({ hs: result.hscode_result });
        navigation.replace('IngredientResult');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '인식에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }, [productId, hsForceError, patch, navigation]);

  if (busy) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Analyzing steps={ANALYZE_STEPS} />
      </Screen>
    );
  }

  if (!permission?.granted) {
    return (
      <Screen>
        <AppHeader title="표시사항 촬영" onBack={() => navigation.goBack()} />
        <View style={s.permission}>
          <Icon name="file-text" size={40} color={colors.textMuted} />
          <Text style={s.permissionTitle}>카메라 권한이 필요합니다</Text>
          <Text style={s.permissionText}>
            포장 뒷면의 표시사항을 촬영해 원재료와 함량을 읽습니다.
          </Text>
          <Button label="카메라 권한 허용" onPress={requestPermission} style={s.permissionBtn} />
          <Button
            label="직접 입력하기"
            variant="secondary"
            onPress={() => navigation.navigate('IngredientManual')}
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
          <Text style={s.topTitle}>표시사항 촬영</Text>
          <View style={s.topSpacer} />
        </View>

        <View style={s.guideFrame} pointerEvents="none">
          <View style={s.guideBox} />
          <Text style={s.guideCaption}>표시사항 전체가 네모 안에 들어오게</Text>
        </View>

        <View style={s.bottom}>
          {error ? (
            <View style={s.errorWrap}>
              <Banner tone="warn" title="인식 실패" message={error} />
              <Button
                label="직접 입력하기"
                variant="secondary"
                onPress={() => navigation.navigate('IngredientManual')}
              />
            </View>
          ) : null}

          <Text style={s.guide}>포장 뒷면의 원재료명·함량 표를 찍어주세요</Text>

          <View style={s.shutterRow}>
            <Pressable onPress={() => navigation.navigate('IngredientManual')} style={s.sideAction} hitSlop={10}>
              <Icon name="edit" size={20} color="#FFFFFF" />
              <Text style={s.sideText}>직접 입력</Text>
            </Pressable>

            <Pressable onPress={capture} style={s.shutter}>
              <View style={s.shutterInner} />
            </Pressable>

            <View style={s.sideAction} />
          </View>
        </View>
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  overlayScreen: { backgroundColor: 'transparent' },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  topTitle: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  topSpacer: { width: 26 },

  guideFrame: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  guideBox: {
    width: '78%',
    aspectRatio: 3 / 4,
    borderWidth: 2.4,
    borderColor: 'rgba(255,255,255,0.75)',
    borderRadius: radius.md,
    borderStyle: 'dashed',
  },
  guideCaption: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5 },

  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    backgroundColor: 'rgba(11,27,46,0.72)',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  errorWrap: { gap: spacing.sm },
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
  shutterInner: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: '#FFFFFF' },

  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  permissionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  permissionText: { fontSize: 13.5, color: colors.textSub, textAlign: 'center', lineHeight: 20 },
  permissionBtn: { alignSelf: 'stretch', marginTop: spacing.sm },
});
