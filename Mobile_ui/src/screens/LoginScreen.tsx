import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AuthPrimaryButton from '../components/auth/AuthPrimaryButton';
import AuthScreenLayout from '../components/auth/AuthScreenLayout';
import AuthTextField from '../components/auth/AuthTextField';
import { loginUser, type AuthResponse } from '../services/api';
import { colors } from '../theme/colors';
import { space } from '../theme/spacing';

type Props = {
  onSignedIn: (session: AuthResponse) => void;
  onGoSignup: () => void;
  /** Shown once after successful registration (e.g. “Please sign in”). */
  successMessage?: string | null;
  initialEmail?: string;
  onConsumeSuccessMessage?: () => void;
};

export default function LoginScreen({
  onSignedIn,
  onGoSignup,
  successMessage,
  initialEmail,
  onConsumeSuccessMessage,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState('');
  const [bannerErr, setBannerErr] = useState(false);
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({});

  const clearBanner = useCallback(() => {
    setBanner('');
    setBannerErr(false);
  }, []);

  useEffect(() => {
    if (successMessage) {
      setBanner(successMessage);
      setBannerErr(false);
      onConsumeSuccessMessage?.();
    }
  }, [successMessage, onConsumeSuccessMessage]);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const onSubmit = async () => {
    const next: typeof fieldErr = {};
    if (!email.trim()) {
      next.email = 'Please enter your email.';
    }
    if (!password) {
      next.password = 'Please enter your password.';
    }
    setFieldErr(next);
    if (Object.keys(next).length > 0) {
      clearBanner();
      return;
    }

    setBusy(true);
    clearBanner();
    try {
      const session = await loginUser({ email: email.trim(), password });
      onSignedIn(session);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : 'Login failed');
      setBannerErr(true);
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <View style={styles.footer}>
      {!!banner && (
        <View style={[styles.banner, bannerErr ? styles.bannerErr : styles.bannerOk]}>
          <Text style={[styles.bannerText, bannerErr ? styles.bannerTextErr : styles.bannerTextOk]}>
            {banner}
          </Text>
        </View>
      )}

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.signupRow}>
        <Text style={styles.signupHint}>New here?</Text>
        <Pressable
          onPress={onGoSignup}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Create a new account"
        >
          <Text style={styles.signupLink}>Create an account</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <AuthScreenLayout kicker="Sign in" title="Welcome back" alignHeader="center" footer={footer}>
      <AuthTextField
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        value={email}
        error={fieldErr.email}
        onChangeText={(t) => {
          setEmail(t);
          setFieldErr((e) => {
            const n = { ...e };
            delete n.email;
            return n;
          });
        }}
      />
      <AuthTextField
        label="Password"
        placeholder="Your password"
        secureTextEntry
        showPasswordToggle
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
        value={password}
        error={fieldErr.password}
        onChangeText={(t) => {
          setPassword(t);
          setFieldErr((e) => {
            const n = { ...e };
            delete n.password;
            return n;
          });
        }}
      />

      <AuthPrimaryButton label="Log in" onPress={() => void onSubmit()} loading={busy} disabled={busy} />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: space.sm,
    alignItems: 'center',
  },
  banner: {
    alignSelf: 'stretch',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
  },
  bannerErr: {
    backgroundColor: colors.bannerErrorBg,
    borderWidth: 1,
    borderColor: colors.bannerErrorBorder,
  },
  bannerOk: {
    backgroundColor: colors.bannerOkBg,
    borderWidth: 1,
    borderColor: colors.bannerOkBorder,
  },
  bannerText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  bannerTextErr: { color: colors.danger },
  bannerTextOk: { color: colors.success },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: space.xs,
    marginBottom: space.sm,
    gap: space.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  signupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.xs,
  },
  signupHint: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  signupLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
});
