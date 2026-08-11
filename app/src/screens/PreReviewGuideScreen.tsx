import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { AppHeader, Body, Button, Card, Footer, Screen } from '../components/ui';
import { useFlow } from '../state/FlowContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STEPS = [
  {
    title: '신청서 작성',
    body: '관세청 관세법령정보포털(UNIPASS)에서 「품목분류 사전심사」를 신청합니다. 품명, 용도, 제조공정, 성분비를 적습니다.',
  },
  {
    title: '견본 제출',
    body: '심사에 필요한 견본과 성분분석표를 함께 제출합니다. 앱에서 읽은 원재료·함량표를 그대로 쓸 수 있습니다.',
  },
  {
    title: '심사 결과 회신',
    body: '통상 30일 이내에 품목분류 결정이 회신됩니다. 결정된 코드는 이후 신고에 그대로 사용할 수 있습니다.',
  },
];

export default function PreReviewGuideScreen() {
  const navigation = useNavigation<Nav>();
  const { hs } = useFlow();

  return (
    <Screen>
      <AppHeader title="사전심사 신청 안내" onBack={() => navigation.goBack()} />

      <Body>
        <Text style={s.lead}>
          이 품목은 문언만으로 코드를 확정하기 어렵습니다. 잘못된 코드로 신고하면 수정신고·가산세가 발생할 수 있어,
          미리 관세청의 판단을 받아두는 편이 안전합니다.
        </Text>

        {hs?.hs_code_formatted ? (
          <Card style={s.codeCard}>
            <Text style={s.codeLabel}>신청 대상 코드</Text>
            <Text style={s.codeValue}>{hs.hs_code_formatted}</Text>
            {hs.reasoning ? <Text style={s.codeReason}>{hs.reasoning}</Text> : null}
          </Card>
        ) : null}

        {STEPS.map((step, index) => (
          <Card key={step.title}>
            <View style={s.stepHead}>
              <View style={s.stepBadge}>
                <Text style={s.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={s.stepTitle}>{step.title}</Text>
            </View>
            <Text style={s.stepBody}>{step.body}</Text>
          </Card>
        ))}

        <Text style={s.footnote}>
          ※ 이 안내는 시연용 요약입니다. 실제 신청 요건과 처리 기간은 관세청 공지를 따릅니다.
        </Text>
      </Body>

      <Footer>
        <Button
          label="관세법령정보포털 열기"
          variant="secondary"
          icon="globe"
          onPress={() => Linking.openURL('https://unipass.customs.go.kr')}
        />
        <Button label="확인" onPress={() => navigation.goBack()} />
      </Footer>
    </Screen>
  );
}

const s = StyleSheet.create({
  lead: { fontSize: 14, color: colors.text, lineHeight: 21 },

  codeCard: { backgroundColor: colors.navySoft, borderColor: '#D3DFEE', gap: 4 },
  codeLabel: { fontSize: 12, color: colors.navy, fontWeight: '600' },
  codeValue: { fontSize: 24, fontWeight: '800', color: colors.navy, fontVariant: ['tabular-nums'] },
  codeReason: { fontSize: 12.5, color: colors.navy, opacity: 0.85, lineHeight: 19, marginTop: 4 },

  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 7 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: colors.onNavy, fontSize: 12, fontWeight: '700' },
  stepTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  stepBody: { fontSize: 13.5, color: colors.textSub, lineHeight: 21 },

  footnote: { fontSize: 11.5, color: colors.textMuted, lineHeight: 18 },
});
