import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { api, ApiError } from '../api/client';
import { BoxOverlay } from '../components/BoxOverlay';
import { TextField } from '../components/Field';
import { StepBar } from '../components/StepBar';
import { AppHeader, Banner, Body, Button, Card, Chip, Footer, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CbmResultScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, boxPhotoUri, boxOverlay, dimensions, patch } = useFlow();

  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  if (!dimensions) {
    return (
      <Screen>
        <AppHeader title="체적 측정 결과" onBack={() => navigation.goBack()} />
        <Banner tone="danger" title="측정 결과가 없습니다" message="박스를 다시 촬영해주세요." />
      </Screen>
    );
  }

  const cbm = (dimensions.width_mm * dimensions.depth_mm * dimensions.height_mm) / 1_000_000_000;
  const weightValue = Number(weight);
  const weightValid = weight.trim().length > 0 && Number.isFinite(weightValue) && weightValue > 0;

  function handleImageLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setImageSize({ width, height });
  }

  async function handleConfirm() {
    if (!weightValid) {
      setError('무게를 입력해주세요');
      return;
    }
    if (!productId || !dimensions) return;

    setError(null);
    setApiError(null);
    setBusy(true);
    try {
      const { cbm_result } = await api.confirmCbm(productId, {
        ...dimensions,
        weight_kg: weightValue,
        input_method: 'ai',
      });
      patch({ cbm: cbm_result });
      navigation.navigate('LabelCapture');
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="체적 측정 결과" onBack={() => navigation.goBack()} />
      <StepBar current={2} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <Body>
          {apiError ? <Banner tone="danger" title="저장 실패" message={apiError} icon="alert-circle" /> : null}

          {boxPhotoUri ? (
            <View style={s.preview} onLayout={handleImageLayout}>
              <Image source={{ uri: boxPhotoUri }} style={s.previewImage} resizeMode="cover" />
              {boxOverlay && imageSize.width > 0 ? (
                <BoxOverlay overlay={boxOverlay} width={imageSize.width} height={imageSize.height} />
              ) : null}
              <View style={s.previewBadge}>
                <Chip label="마커 인식됨" tone="success" />
              </View>
            </View>
          ) : null}

          <Card>
            <View style={s.dimRow}>
              <Dim label="가로" value={dimensions.width_mm} />
              <View style={s.dimDivider} />
              <Dim label="세로" value={dimensions.depth_mm} />
              <View style={s.dimDivider} />
              <Dim label="높이" value={dimensions.height_mm} />
            </View>

            <View style={s.cbmBox}>
              <Text style={s.cbmLabel}>체적</Text>
              <Text style={s.cbmValue}>
                {cbm.toFixed(3)}
                <Text style={s.cbmUnit}> CBM</Text>
              </Text>
            </View>
          </Card>

          <Card>
            <TextField
              label="무게 (필수)"
              value={weight}
              onChangeText={(v) => {
                setWeight(v.replace(/[^0-9.]/g, ''));
                if (error) setError(null);
              }}
              placeholder="예: 11.4"
              keyboardType="decimal-pad"
              suffix="kg"
              error={error}
              hint="무게는 사진으로 잴 수 없어 직접 입력합니다."
            />
          </Card>
        </Body>

        <Footer>
          <Button
            label="다시 촬영"
            variant="secondary"
            icon="refresh"
            onPress={() => navigation.replace('BoxCapture')}
          />
          <Button label="확인" onPress={handleConfirm} disabled={!weightValid} loading={busy} />
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Dim({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.dim}>
      <Text style={s.dimLabel}>{label}</Text>
      <Text style={s.dimValue}>{value}</Text>
      <Text style={s.dimUnit}>mm</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },

  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0B1B2E',
  },
  previewImage: { width: '100%', height: '100%' },
  previewBadge: { position: 'absolute', top: spacing.md, left: spacing.md },

  dimRow: { flexDirection: 'row', alignItems: 'center' },
  dim: { flex: 1, alignItems: 'center', gap: 2 },
  dimLabel: { fontSize: 12, color: colors.textSub },
  dimValue: { fontSize: 24, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  dimUnit: { fontSize: 11, color: colors.textMuted },
  dimDivider: { width: 1, height: 34, backgroundColor: colors.border },

  cbmBox: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cbmLabel: { fontSize: 14, color: colors.textSub, fontWeight: '600' },
  cbmValue: { fontSize: 30, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'] },
  cbmUnit: { fontSize: 15, fontWeight: '700', color: colors.textSub },
});
