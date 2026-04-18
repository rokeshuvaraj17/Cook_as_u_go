import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '../../theme/colors';
import { radius, space } from '../../theme/spacing';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  showPasswordToggle?: boolean;
};

export default function AuthTextField({
  label,
  hint,
  error,
  showPasswordToggle,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const isPassword = !!secureTextEntry;
  const showSecure = isPassword && !visible;

  const borderColor = error ? colors.borderError : focused ? colors.borderFocus : colors.border;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.fieldRow, { borderColor }]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={showPasswordToggle ? showSecure : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
          accessibilityLabel={label}
          {...rest}
        />
        {showPasswordToggle && isPassword ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={12}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          >
            <MaterialIcons
              name={visible ? 'visibility-off' : 'visibility'}
              size={22}
              color={focused ? colors.sage : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.md + 2,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: space.xs + 2,
    letterSpacing: 0.2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 54,
    paddingHorizontal: space.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 15,
    letterSpacing: 0.15,
  },
  eye: {
    paddingLeft: space.sm,
    paddingVertical: space.xs,
  },
  hint: {
    marginTop: space.xs + 2,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  error: {
    marginTop: space.xs + 2,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
