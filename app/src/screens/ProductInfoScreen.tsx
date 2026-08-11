import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, ApiError } from '../api/client';
import { FieldGroup, TextField } from '../components/Field';
import { StepBar } from '../components/StepBar';
import { AppHeader, Banner, Button, Card, Footer, Screen, SectionTitle } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const COUNTRIES = ['일본', '중국', '미국', '베트남', '대만'] as const;

const SUGGESTIONS = [
  '담양 떡갈비 (냉동 밀키트)',
  '여수 돌산갓김치',
  '나주 배즙',
  '담양 한과',
  '장흥 표고버섯 스낵',
  '고추장',
];

export default function ProductInfoScreen() {
  const navigation = useNavigation<Nav>();
  const { start } = useFlow();

  const [name, setName] = useState('');
  const [country, setCountry] = useState<string>('일본');
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0;

  async function handleNext() {
    if (!canSubmit) {
      setError('상품명을 입력해주세요');
      return;
    }
    setError(null);
    setApiError(null);
    setBusy(true);
    try {
      const created = await api.createProduct(trimmed, country);
      start(created.product_id, created.product_name, country);
      navigation.navigate('Waybill');
    } catch (e) {
      setApiError(e instanceof ApiError ? e.message : '상품 등록에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="수출 화물 등록" onBack={() => navigation.goBack()} />
      <StepBar current={0} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.intro}>
            <Text style={s.introTitle}>상품명만 입력하면 됩니다</Text>
            <Text style={s.introText}>나머지 정보는 사진 두 장으로 채워집니다.</Text>
          </View>

          {apiError ? <Banner tone="danger" title="연결 실패" message={apiError} icon="alert-circle" /> : null}

          <Card>
            <FieldGroup>
              <TextField
                label="상품명"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (error) setError(null);
                }}
                placeholder="상품명을 입력하세요"
                error={error}
                autoFocus
              />

              <View>
                <Text style={s.label}>수출 희망국</Text>
                <View style={s.chipRow}>
                  {COUNTRIES.map((item) => {
                    const active = item === country;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => setCountry(item)}
                        style={[s.countryChip, active && s.countryChipActive]}
                      >
                        <Text style={[s.countryText, active && s.countryTextActive]}>{item}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </FieldGroup>
          </Card>

          <SectionTitle>자주 쓰는 품목</SectionTitle>
          <View style={s.chipRow}>
            {SUGGESTIONS.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setName(item);
                  setError(null);
                }}
                style={s.suggestChip}
              >
                <Text style={s.suggestText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Footer>
          <Button label="다음 : 운송장 준비" onPress={handleNext} disabled={!canSubmit} loading={busy} />
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  intro: { gap: 4, paddingVertical: spacing.sm },
  introTitle: { fontSize: 21, fontWeight: '700', color: colors.text },
  introText: { fontSize: 14, color: colors.textSub, lineHeight: 20 },

  label: { fontSize: 13, fontWeight: '600', color: colors.textSub, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  countryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1.3,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  countryChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  countryText: { fontSize: 13.5, fontWeight: '600', color: colors.textSub },
  countryTextActive: { color: colors.onNavy },

  suggestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.navySoft,
  },
  suggestText: { fontSize: 12.5, color: colors.navy, fontWeight: '600' },
});
