import React, { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing, statusTheme, type HsStatus } from '../theme';
import { Icon, type IconName } from './Icon';

/* ------------------------------------------------------------------ 화면 골격 */

export function Screen({
  children,
  style,
  edges = ['top'],
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
}) {
  return (
    <SafeAreaView style={[s.screen, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

export function Body({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={[s.bodyContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

/**
 * 하단에 고정되는 액션 영역.
 * 평소에는 홈 인디케이터를 피해 안전영역만큼 띄우고,
 * 키보드가 올라오면 그 여백을 걷어 버튼이 키보드에 바로 붙게 한다.
 */
export function Footer({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardVisible();

  return (
    <View
      style={[
        s.footer,
        { paddingBottom: keyboardUp ? spacing.md : Math.max(insets.bottom, spacing.lg) },
      ]}
    >
      {children}
    </View>
  );
}

function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // iOS는 애니메이션 시작 시점(will)이 있어야 여백이 따로 놀지 않는다
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

export function AppHeader({
  title,
  onBack,
  right,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={s.header}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={s.headerBack}>
          <Icon name="chevron-left" size={24} color={colors.text} />
        </Pressable>
      ) : (
        <View style={s.headerBack} />
      )}
      <View style={s.headerTitleWrap}>
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={s.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={s.headerRight}>{right}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ 버튼 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const palette = buttonPalette(variant, !!isDisabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && !isDisabled && s.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={palette.fg} strokeWidth={2.1} /> : null}
          <Text style={[s.buttonLabel, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function buttonPalette(variant: ButtonVariant, disabled: boolean) {
  if (disabled) {
    return { bg: '#DFE3E9', fg: '#9AA3B0', border: '#DFE3E9' };
  }
  switch (variant) {
    case 'primary':
      return { bg: colors.navy, fg: colors.onNavy, border: colors.navy };
    case 'secondary':
      return { bg: colors.surface, fg: colors.navy, border: colors.navy };
    case 'danger':
      return { bg: colors.dangerAccent, fg: '#FFFFFF', border: colors.dangerAccent };
    case 'ghost':
      return { bg: 'transparent', fg: colors.textSub, border: 'transparent' };
  }
}

/* ------------------------------------------------------------------ 카드 */

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const content = <View style={[s.card, padded && s.cardPadded, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && s.cardPressed}>
      {content}
    </Pressable>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.sectionTitle, style]}>{children}</Text>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[s.divider, style]} />;
}

/** 라벨 - 값 한 줄. 시연 화면의 표 형태 정보에 쓴다. */
export function KeyValue({
  label,
  value,
  valueStyle,
  strong,
}: {
  label: string;
  value: ReactNode;
  valueStyle?: StyleProp<TextStyle>;
  strong?: boolean;
}) {
  return (
    <View style={s.kv}>
      <Text style={s.kvLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[s.kvValue, strong && s.kvValueStrong, valueStyle]}>{value}</Text>
      ) : (
        <View style={s.kvSlot}>{value}</View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ 뱃지 */

export function StatusBadge({ status, size = 'md' }: { status: HsStatus | null | undefined; size?: 'sm' | 'md' }) {
  const t = statusTheme(status);
  return (
    <View style={[s.badge, { backgroundColor: t.bg }, size === 'sm' && s.badgeSm]}>
      <Text style={[s.badgeText, { color: t.fg }, size === 'sm' && s.badgeTextSm]}>{t.label}</Text>
    </View>
  );
}

export function Chip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'navy' | 'success' | 'warn' | 'danger';
}) {
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textSub },
    navy: { bg: colors.navySoft, fg: colors.navy },
    success: { bg: colors.successBg, fg: colors.successFg },
    warn: { bg: colors.warnBg, fg: colors.warnFg },
    danger: { bg: colors.dangerBg, fg: colors.dangerFg },
  }[tone];
  return (
    <View style={[s.chip, { backgroundColor: map.bg }]}>
      <Text style={[s.chipText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ 배너 */

export function Banner({
  tone,
  title,
  message,
  icon = 'alert-triangle',
}: {
  tone: 'warn' | 'danger' | 'info' | 'success';
  title: string;
  message?: string;
  icon?: IconName;
}) {
  const map = {
    warn: { bg: colors.warnBg, fg: colors.warnFg },
    danger: { bg: colors.dangerBg, fg: colors.dangerFg },
    info: { bg: colors.infoBg, fg: colors.infoFg },
    success: { bg: colors.successBg, fg: colors.successFg },
  }[tone];

  return (
    <View style={[s.banner, { backgroundColor: map.bg }]}>
      <Icon name={icon} size={22} color={map.fg} />
      <View style={s.bannerBody}>
        <Text style={[s.bannerTitle, { color: map.fg }]}>{title}</Text>
        {message ? <Text style={[s.bannerMessage, { color: map.fg }]}>{message}</Text> : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ 상태 표시 */

export function Loading({ label }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.navy} />
      {label ? <Text style={s.centerText}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Icon name="alert-circle" size={38} color={colors.dangerAccent} />
      <Text style={[s.centerText, s.errorText]}>{message}</Text>
      {onRetry ? <Button label="다시 시도" variant="secondary" onPress={onRetry} style={s.retryBtn} /> : null}
    </View>
  );
}

export function EmptyState({ icon, title, message }: { icon: IconName; title: string; message?: string }) {
  return (
    <View style={s.center}>
      <Icon name={icon} size={34} color={colors.textMuted} />
      <Text style={s.emptyTitle}>{title}</Text>
      {message ? <Text style={s.centerText}>{message}</Text> : null}
    </View>
  );
}

/** 목록 행 — 설정 화면 등에 쓴다. */
export function ListRow({
  label,
  icon,
  onPress,
  value,
  last,
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  value?: string;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.listRow, !last && s.listRowBorder, pressed && s.listRowPressed]}
    >
      {icon ? <Icon name={icon} size={19} color={colors.textSub} /> : null}
      <Text style={s.listRowLabel}>{label}</Text>
      {value ? <Text style={s.listRowValue}>{value}</Text> : null}
      <Icon name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  footer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: { width: 34, alignItems: 'flex-start' },
  headerRight: { minWidth: 34, alignItems: 'flex-end' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.4,
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: { opacity: 0.82 },
  buttonLabel: { fontSize: 15.5, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardPadded: { padding: spacing.lg },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSub,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  kvLabel: { fontSize: 13.5, color: colors.textSub, flexShrink: 0 },
  kvValue: { fontSize: 14.5, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  kvValueStrong: { fontSize: 16, fontWeight: '700' },
  kvSlot: { flexShrink: 1, alignItems: 'flex-end' },

  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12.5, fontWeight: '700' },
  badgeTextSm: { fontSize: 11 },

  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start' },
  chipText: { fontSize: 11.5, fontWeight: '600' },

  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  bannerBody: { flex: 1, gap: 3 },
  bannerTitle: { fontSize: 14.5, fontWeight: '700', lineHeight: 20 },
  bannerMessage: { fontSize: 13, lineHeight: 19, opacity: 0.92 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  centerText: { fontSize: 14, color: colors.textSub, textAlign: 'center', lineHeight: 21 },
  errorText: { color: colors.text },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  retryBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.xxl },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
  },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  listRowPressed: { backgroundColor: colors.surfaceAlt },
  listRowLabel: { flex: 1, fontSize: 14.5, color: colors.text, fontWeight: '500' },
  listRowValue: { fontSize: 13, color: colors.textMuted },
});

export { s as uiStyles };
