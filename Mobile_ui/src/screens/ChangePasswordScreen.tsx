import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { changePassword } from '../services/api';
import { colors } from '../theme/colors';
import { radius, space } from '../theme/spacing';

type Props = {
  authToken: string;
  onBack: () => void;
};

export default function ChangePasswordScreen({ authToken, onBack }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (busy) return;
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'New password should be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirm password do not match.');
      return;
    }
    try {
      setBusy(true);
      await changePassword(authToken, { currentPassword, newPassword });
      Alert.alert('Done', 'Password updated successfully.');
      onBack();
    } catch (e) {
      Alert.alert('Could not change password', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.sage} />
        </Pressable>
        <Text style={styles.title}>Change password</Text>
      </View>
      <View style={styles.content}>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Current password"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirm new password"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Pressable onPress={() => void onSubmit()} style={styles.submit}>
          <Text style={styles.submitText}>{busy ? 'Saving...' : 'Update password'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl },
  input: {
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: space.md,
  },
  submit: {
    marginTop: space.sm,
    backgroundColor: colors.primary,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  submitText: { color: colors.canvas, fontSize: 16, fontWeight: '800' },
});
