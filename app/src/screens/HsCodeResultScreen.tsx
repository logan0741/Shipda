import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import { HsCodeDisplay } from '../components/HsCodeDisplay';
import { Icon } from '../components/Icon';
import { StepBar } from '../components/StepBar';
import { AppHeader, Banner, Body, Button, Card, Footer, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing, statusTheme } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LOW_CONFIDENCE = 0.5;

export default function HsCodeResultScreen() {
  const navigation = useNavigation<Nav>();
  const { productId, hs, patch } = useFlow();

  const [busy, setBusy] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  if (!hs) {
    return (
      <Screen>
        <AppHeader title="HS Code 판정" onBack={() => navigation.goBack()} />
        <Banner tone="danger" title="판정 결과가 없습니다" message="표시사항을 다시 촬영해주세요." />
      </Screen>
    );
  }

  const confidencePct = hs.confidence != null ? Math.round(hs.confidence * 100) : null;
  const lowConfidence = hs.confidence != null && hs.confidence < LOW_CONFIDENCE;
  const tone = statusTheme(hs.status);

  async function chooseAlternative(hsCode: string) {
    if (!productId) return;
    setBusy(hsCode);
    setApiError(null);
    try {
      const { hscode_result } = await api.selectHsCode(productId, hsCode);
      patch({ hs: hscode_result });
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : '후보를 선택하지 못했습니다.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <AppHeader title="HS Code 판정" onBack={() => navigation.goBack()} />
      <StepBar current={4} />

      <Body>
        {apiError ? <Banner tone="danger" title="처리 실패" message={apiError} icon="alert-circle" /> : null}

        {lowConfidence ? (
          <Banner
            tone="danger"
            title={`신뢰도가 낮아요 (${confidencePct}%)`}
            message="사진을 다시 확인하거나, 아래 후보 중에서 직접 선택해주세요."
          />
        ) : null}

        {hs.input_method === 'manual' && hs.hs_code == null ? (
          <Banner
            tone="warn"
            title="직접 입력한 내용은 자동 판정하지 않아요"
            message="관세사 검토 또는 관세청 사전심사를 거쳐 코드를 확정해야 합니다."
          />
        ) : null}

        <Text style={s.lead}>
          앞 화면에서 읽은 원재료와 가공방식으로 관세율표를 조회하고, HS 통칙을 적용해 코드를 정했습니다.
        </Text>

        <HsCodeDisplay
          parts={hs.hs_code_parts}
          formatted={hs.hs_code_formatted}
          status={hs.status}
          confidence={hs.confidence}
        />

        <Card>
          <View style={s.reasonHead}>
            <Icon name="search" size={17} color={colors.textSub} />
            <Text style={s.reasonTitle}>판정 근거</Text>
          </View>
          <Text style={s.reasonText}>{hs.reasoning}</Text>

          {hs.review_note ? (
            <View style={[s.noteBox, { backgroundColor: tone.bg }]}>
              <Text style={[s.noteText, { color: tone.fg }]}>{hs.review_note}</Text>
            </View>
          ) : null}
        </Card>

        {hs.alternatives.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>차순위 후보</Text>
            <Card padded={false}>
              {hs.alternatives.map((alt, index) => (
                <Pressable
                  key={alt.hs_code}
                  onPress={() => chooseAlternative(alt.hs_code)}
                  disabled={busy != null}
                  style={({ pressed }) => [
                    s.altRow,
                    index < hs.alternatives.length - 1 && s.altRowBorder,
                    pressed && s.altRowPressed,
                  ]}
                >
                  <View style={s.altBody}>
                    <Text style={s.altCode}>{alt.hs_code_formatted}</Text>
                    <Text style={s.altName}>{alt.name}</Text>
                  </View>
                  <View style={s.altRight}>
                    <Text style={s.altConfidence}>{Math.round(alt.confidence * 100)}%</Text>
                    {busy === alt.hs_code ? null : (
                      <Icon name="chevron-right" size={17} color={colors.textMuted} />
                    )}
                  </View>
                </Pressable>
              ))}
            </Card>
            <Text style={s.altHint}>후보를 누르면 그 코드로 바꿀 수 있습니다. 이 경우 '검토 필요'로 표시됩니다.</Text>
          </>
        ) : null}
      </Body>

      <Footer>
        {hs.status !== 'approved' ? (
          <Button
            label="관세청 품목분류 사전심사 신청 안내"
            variant="secondary"
            icon="info"
            onPress={() => navigation.navigate('PreReviewGuide')}
          />
        ) : null}
        {lowConfidence ? (
          <Button
            label="사진 다시 촬영"
            variant="secondary"
            icon="refresh"
            onPress={() => navigation.navigate('LabelCapture')}
          />
        ) : null}
        <Button label="이 코드로 진행" onPress={() => navigation.navigate('Summary')} />
      </Footer>
    </Screen>
  );
}

const s = StyleSheet.create({
  lead: { fontSize: 13.5, color: colors.textSub, lineHeight: 20 },

  reasonHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.sm },
  reasonTitle: { fontSize: 13, fontWeight: '700', color: colors.textSub },
  reasonText: { fontSize: 14, color: colors.text, lineHeight: 21 },
  noteBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.sm },
  noteText: { fontSize: 12.5, lineHeight: 19 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSub, marginTop: spacing.sm },

  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: spacing.md,
  },
  altRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  altRowPressed: { backgroundColor: colors.surfaceAlt },
  altBody: { flex: 1, gap: 2 },
  altCode: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  altName: { fontSize: 12.5, color: colors.textSub },
  altRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  altConfidence: { fontSize: 13, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  altHint: { fontSize: 11.5, color: colors.textMuted, lineHeight: 17 },
});
