import { Alert, Platform } from 'react-native';

type DestructiveConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export function confirmDestructiveAction({
  title,
  message,
  confirmLabel = 'Archive',
  onConfirm,
}: DestructiveConfirmationOptions) {
  if (Platform.OS === 'web') {
    const confirm = globalThis.confirm;
    if (typeof confirm === 'function' && confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
