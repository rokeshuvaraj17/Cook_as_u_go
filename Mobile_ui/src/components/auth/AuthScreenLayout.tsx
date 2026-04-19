import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { radius, space } from '../../theme/spacing';

type Props = {
  kicker: string;
  title: string;
  /** Omit or leave empty to hide the subtitle line. */
  subtitle?: string;
  /** Center kicker + title + subtitle in the sheet (e.g. login). */
  alignHeader?: 'left' | 'center';
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
};

export default function AuthScreenLayout({
  kicker,
  title,
  subtitle,
  alignHeader = 'left',
  children,
  footer,
  onBack,
  backLabel = 'Back',
}: Props) {
  const headerCentered = alignHeader === 'center';
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: space.xxl + insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero: soft atmosphere + brand only */}
            <View style={styles.heroWrap}>
              <LinearGradient
                colors={[colors.heroTop, colors.heroMid, colors.heroBottom]}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.decorBlobA} />
              <View pointerEvents="none" style={styles.decorBlobB} />

              <View style={[styles.heroInner, { paddingTop: space.sm }]}>
                {onBack ? (
                  <Pressable
                    onPress={onBack}
                    style={styles.backRow}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={backLabel}
                  >
                    <Text style={styles.backChevron}>‹</Text>
                    <Text style={styles.backText}>{backLabel}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.backSpacer} />
                )}

                <View style={styles.brandBlock}>
                  <View style={styles.brandMark}>
                    <Text style={styles.brandEmoji} accessibilityLabel="App icon">
                      🍳
                    </Text>
                  </View>
                  <Text style={styles.brandWordmark}>Cook As You Go</Text>
                </View>
              </View>
            </View>

            {/* Sheet: headline + form — clear “work area” */}
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              {headerCentered ? (
                <View style={styles.kickerPill}>
                  <Text style={styles.kickerPillText}>{kicker}</Text>
                </View>
              ) : (
                <Text style={styles.kicker}>{kicker}</Text>
              )}
              <Text
                style={[
                  styles.title,
                  !subtitle?.trim() && styles.titleTight,
                  headerCentered && styles.titleCenter,
                ]}
              >
                {title}
              </Text>
              {subtitle?.trim() ? (
                <Text style={[styles.subtitle, headerCentered && styles.subtitleCenter]}>
                  {subtitle.trim()}
                </Text>
              ) : null}

              <View style={styles.formBlock}>
                {children}
                {footer}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const SHEET_RADIUS = 28;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  /** Required on Android so the sheet + form are laid out inside a flex parent (otherwise only the hero can show). */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroWrap: {
    minHeight: 200,
    paddingBottom: space.xl + 8,
  },
  heroInner: {
    paddingHorizontal: space.lg,
    zIndex: 1,
  },
  decorBlobA: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.decorBlush,
    top: 12,
    right: -36,
  },
  decorBlobB: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.decorSage,
    bottom: 28,
    left: -22,
  },
  backSpacer: {
    height: 8,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: space.sm,
    marginBottom: space.md,
  },
  backChevron: {
    color: colors.sage,
    fontSize: 30,
    fontWeight: '300',
    marginRight: 2,
    marginTop: -4,
  },
  backText: {
    color: colors.sage,
    fontSize: 16,
    fontWeight: '700',
  },
  brandBlock: {
    alignItems: 'center',
    paddingTop: space.xs,
  },
  brandMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  brandEmoji: {
    fontSize: 32,
  },
  brandWordmark: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  sheet: {
    marginTop: -SHEET_RADIUS,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: space.lg,
    paddingTop: space.md + 4,
    paddingBottom: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: space.lg,
    opacity: 0.85,
  },
  kicker: {
    color: colors.sage,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: space.sm,
  },
  kickerPill: {
    alignSelf: 'center',
    backgroundColor: colors.sageMuted,
    paddingHorizontal: space.md + 4,
    paddingVertical: space.xs + 4,
    borderRadius: radius.full,
    marginBottom: space.md,
  },
  kickerPillText: {
    color: colors.sage,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: space.sm,
  },
  titleCenter: {
    textAlign: 'center',
  },
  titleTight: {
    marginBottom: space.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: space.lg,
    fontWeight: '500',
    maxWidth: 360,
  },
  subtitleCenter: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  formBlock: {
    marginTop: space.xs,
  },
});
