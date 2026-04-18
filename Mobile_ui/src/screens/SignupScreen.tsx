import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthPrimaryButton from '../components/auth/AuthPrimaryButton';
import AuthScreenLayout from '../components/auth/AuthScreenLayout';
import AuthTextField from '../components/auth/AuthTextField';
import { registerUser } from '../services/api';
import { colors } from '../theme/colors';
import { space } from '../theme/spacing';

type Props = {
  /** Called after account is created — app navigates to login. */
  onRegistered: (email: string) => void;
  onGoLogin: () => void;
};

export default function SignupScreen({ onRegistered, onGoLogin }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState('');
  const [bannerErr, setBannerErr] = useState(false);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  const clearBanner = useCallback(() => {
    setBanner('');
    setBannerErr(false);
  }, []);

  const onSubmit = async () => {
    const next: Record<string, string> = {};
    if (!email.trim()) {
      next.email = 'Email is required.';
    }
    if (!password) {
      next.password = 'Choose a password.';
    } else if (password.length < 8) {
      next.password = 'Use at least 8 characters.';
    }
    if (password !== confirm) {
      next.confirm = 'Passwords do not match.';
    }
    setFieldErr(next);
    if (Object.keys(next).length > 0) {
      clearBanner();
      return;
    }

    setBusy(true);
    clearBanner();
    try {
      await registerUser({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      });
      onRegistered(email.trim());
    } catch (e) {
      setBanner(e instanceof Error ? e.message : 'Sign up failed');
      setBannerErr(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreenLayout kicker="Join" title="Create your account" onBack={onGoLogin} backLabel="Login">
      <AuthTextField
        label="Display name"
        placeholder="Your name"
        autoCorrect
        value={name}
        error={fieldErr.name}
        onChangeText={(t) => {
          setName(t);
          setFieldErr((e) => {
            const n = { ...e };
            delete n.name;
            return n;
          });
        }}
      />
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
        placeholder="At least 8 characters"
        secureTextEntry
        showPasswordToggle
        returnKeyType="next"
        value={password}
        error={fieldErr.password}
        onChangeText={(t) => {
          setPassword(t);
          setFieldErr((e) => {
            const n = { ...e };
            delete n.password;
            delete n.confirm;
            return n;
          });
        }}
      />
      <AuthTextField
        label="Confirm password"
        placeholder="Repeat password"
        secureTextEntry
        showPasswordToggle
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
        value={confirm}
        error={fieldErr.confirm}
        onChangeText={(t) => {
          setConfirm(t);
          setFieldErr((e) => {
            const n = { ...e };
            delete n.confirm;
            return n;
          });
        }}
      />

      {!!banner && (
        <View style={[styles.banner, bannerErr ? styles.bannerErr : styles.bannerOk]}>
          <Text style={[styles.bannerText, bannerErr ? styles.bannerTextErr : styles.bannerTextOk]}>
            {banner}
          </Text>
        </View>
      )}

      <AuthPrimaryButton label="Create account" onPress={() => void onSubmit()} loading={busy} disabled={busy} />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
    marginTop: space.xs,
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
});
