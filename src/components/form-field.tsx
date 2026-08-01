import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { AppColors, FontFamily, Radius, Spacing } from '@/constants/theme';

type FormFieldProps = Pick<
  TextInputProps,
  | 'autoCapitalize'
  | 'autoComplete'
  | 'keyboardType'
  | 'maxLength'
  | 'multiline'
  | 'numberOfLines'
  | 'onChangeText'
  | 'returnKeyType'
  | 'secureTextEntry'
  | 'textContentType'
  | 'value'
> & {
  label: string;
  placeholder: string;
  hint?: string;
};

export function FormField({ label, placeholder, hint, multiline, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={AppColors.slate}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
        {...inputProps}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.sm,
  },
  label: {
    color: AppColors.ink,
    fontFamily: FontFamily?.medium,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: AppColors.line,
    borderRadius: Radius.md,
    backgroundColor: AppColors.paper,
    color: AppColors.ink,
    fontFamily: FontFamily?.regular,
    fontSize: 16,
    paddingHorizontal: Spacing.lg,
  },
  multiline: {
    minHeight: 108,
    paddingTop: Spacing.lg,
    textAlignVertical: 'top',
  },
  hint: {
    color: AppColors.inkMuted,
    fontFamily: FontFamily?.regular,
    fontSize: 12,
    lineHeight: 17,
  },
});
