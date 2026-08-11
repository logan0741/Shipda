import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { TextField } from '../components/Field';
import { Icon } from '../components/Icon';
import { Body, Button, Card, Chip, ListRow, Screen, SectionTitle } from '../components/ui';
import {
  CBM_ERROR_OPTIONS,
  HS_ERROR_OPTIONS,
  useSettings,
  type CbmForceError,
  type HsForceError,
} from '../state/SettingsContext';
import { colors, radius, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** 시연용 사업자 정보. 실제 서비스에서는 로그인 계정에서 받아온다. */
const BUSINESS = {
  initial: '농',
  name: '전남 농원',
  subtitle: '사업자 정보',
} as const;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const settings = useSettings();

  // 와이어프레임에 없는 시연 제어는 프로필을 길게 눌러야 열린다
  const [devOpen, setDevOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState(settings.baseUrl);

  useEffect(() => {
    setUrlDraft(settings.baseUrl);
  }, [settings.baseUrl]);

  function notReady(title: string) {
    Alert.alert(title, '시연 범위에 포함되지 않은 기능입니다.');
  }

  return (
    <Screen>
      <Pressable
        onLongPress={() => setDevOpen(true)}
        delayLongPress={700}
        style={s.profile}
      >
        <View style={s.avatar}>
          <Text style={s.avatarText}>{BUSINESS.initial}</Text>
        </View>
        <View style={s.profileText}>
          <Text style={s.profileName}>{BUSINESS.name}</Text>
          <Text style={s.profileSub}>{BUSINESS.subtitle}</Text>
        </View>
        {devOpen ? <Chip label="시연 모드" tone="navy" /> : null}
      </Pressable>

      <Body>
        <Card padded={false}>
          <ListRow label="알림 설정" icon="bell" onPress={() => notReady('알림 설정')} />
          <ListRow
            label="사업자 정보 관리"
            icon="briefcase"
            onPress={() => notReady('사업자 정보 관리')}
          />
          <ListRow label="언어 설정" icon="globe" value="한국어" onPress={() => notReady('언어 설정')} />
          <ListRow label="고객센터" icon="headphones" onPress={() => notReady('고객센터')} last />
        </Card>

        {devOpen ? (
          <>
            <SectionTitle>시연 설정</SectionTitle>

            <Card>
              <View style={s.switchRow}>
                <View style={s.switchText}>
                  <Text style={s.switchLabel}>촬영 각도 게이팅</Text>
                  <Text style={s.switchHint}>
                    끄면 30~40도 조건을 무시하고 어떤 각도에서도 촬영할 수 있습니다.
                  </Text>
                </View>
                <Switch
                  value={settings.enforceAngle}
                  onValueChange={settings.setEnforceAngle}
                  trackColor={{ false: colors.borderStrong, true: colors.navyLight }}
                  thumbColor={colors.surface}
                />
              </View>
            </Card>

            <SectionTitle>체적 측정 강제 결과</SectionTitle>
            <Card padded={false}>
              {CBM_ERROR_OPTIONS.map((option, i) => (
                <OptionRow
                  key={String(option.id)}
                  label={option.label}
                  selected={settings.cbmForceError === option.id}
                  onPress={() => settings.setCbmForceError(option.id as CbmForceError)}
                  last={i === CBM_ERROR_OPTIONS.length - 1}
                />
              ))}
            </Card>

            <SectionTitle>HS Code 판정 강제 결과</SectionTitle>
            <Card padded={false}>
              {HS_ERROR_OPTIONS.map((option, i) => (
                <OptionRow
                  key={String(option.id)}
                  label={option.label}
                  selected={settings.hsForceError === option.id}
                  onPress={() => settings.setHsForceError(option.id as HsForceError)}
                  last={i === HS_ERROR_OPTIONS.length - 1}
                />
              ))}
            </Card>

            <SectionTitle>서버 주소</SectionTitle>
            <Card>
              <TextField
                value={urlDraft}
                onChangeText={setUrlDraft}
                placeholder="http://192.168.0.10:8000"
                hint="Expo 개발 서버 주소에서 자동으로 잡습니다. 안 될 때만 직접 입력하세요."
              />
              <View style={s.urlButtons}>
                <Button
                  label="적용"
                  onPress={() => settings.updateBaseUrl(urlDraft.trim())}
                  style={s.urlButton}
                />
                <Button
                  label="자동 감지"
                  variant="secondary"
                  onPress={settings.restoreBaseUrl}
                  style={s.urlButton}
                />
              </View>
            </Card>

            <Button
              label="공동물류 운영 현황"
              variant="secondary"
              icon="layers"
              onPress={() => navigation.navigate('Admin')}
            />
            <Button label="시연 설정 닫기" variant="ghost" onPress={() => setDevOpen(false)} />
          </>
        ) : null}
      </Body>
    </Screen>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
  last,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.option, !last && s.optionBorder, pressed && s.optionPressed]}
    >
      <Text style={[s.optionLabel, selected && s.optionLabelActive]}>{label}</Text>
      {selected ? <Icon name="check" size={17} color={colors.navy} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '800', color: colors.onNavy },
  profileText: { flex: 1, gap: 2 },
  profileName: { fontSize: 16.5, fontWeight: '800', color: colors.text },
  profileSub: { fontSize: 12.5, color: colors.textMuted },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchText: { flex: 1, gap: 3 },
  switchLabel: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  switchHint: { fontSize: 12, color: colors.textSub, lineHeight: 18 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  optionPressed: { backgroundColor: colors.surfaceAlt },
  optionLabel: { fontSize: 14, color: colors.textSub },
  optionLabelActive: { color: colors.navy, fontWeight: '700' },

  urlButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  urlButton: { flex: 1 },
});
