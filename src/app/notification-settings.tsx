import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors, FontFamily, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useReminderNotifications } from '@/providers/reminder-notification-provider';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const {
    supported,
    enabled,
    permission,
    scheduledCount,
    loading,
    syncing,
    error,
    enable,
    disable,
    refresh,
  } = useReminderNotifications();

  const toggleNotifications = async (nextEnabled: boolean) => {
    if (nextEnabled) await enable();
    else await disable();
  };

  const statusTitle = !supported
    ? 'Available in the mobile app'
    : permission === 'denied'
      ? 'Blocked in system settings'
      : enabled
        ? 'Device reminders are on'
        : 'Device reminders are off';
  const statusDetail = !supported
    ? 'The LifeBook website keeps reminders in-app. Install the iOS or Android app to receive local device alerts.'
    : enabled
      ? `${scheduledCount} future ${scheduledCount === 1 ? 'reminder is' : 'reminders are'} scheduled on this device.`
      : 'Nothing is scheduled until you choose to allow notifications on this device.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={AppColors.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>On this device</Text>
            <Text style={styles.title}>Reminder notifications</Text>
            <Text style={styles.subtitle}>Choose whether LifeBook may alert you about upcoming family moments.</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="notifications" size={34} color={AppColors.sun} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{statusTitle}</Text>
            <Text style={styles.heroText}>{statusDetail}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.sectionTitle}>Device reminders</Text>
              <Text style={styles.helper}>Opt in separately on each phone or tablet where you want alerts.</Text>
            </View>
            <Switch
              accessibilityLabel="Device reminder notifications"
              disabled={!supported || loading || syncing}
              value={enabled}
              onValueChange={(value) => void toggleNotifications(value)}
              trackColor={{ false: AppColors.line, true: AppColors.sunSoft }}
              thumbColor={enabled ? AppColors.sun : AppColors.slate}
            />
          </View>
          {supported && enabled ? (
            <Pressable accessibilityRole="button" disabled={syncing} onPress={() => void refresh()} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
              <Ionicons name="refresh" size={18} color={AppColors.violet} />
              <Text style={styles.refreshText}>{syncing ? 'Refreshing…' : 'Refresh schedules'}</Text>
            </Pressable>
          ) : null}
          {supported && permission === 'denied' ? (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
              <Ionicons name="settings-outline" size={18} color={AppColors.paper} />
              <Text style={styles.settingsText}>Open system settings</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacy-safe by design</Text>
          <View style={styles.detailRow}><Ionicons name="lock-closed" size={20} color={AppColors.mint} /><Text style={styles.detailText}>Lock-screen alerts use generic wording and never include a person’s name, reminder title, or notes.</Text></View>
          <View style={styles.detailRow}><Ionicons name="phone-portrait-outline" size={20} color={AppColors.sky} /><Text style={styles.detailText}>Schedules stay on this device. LifeBook does not upload a push token or send reminder details to a notification server.</Text></View>
          <View style={styles.detailRow}><Ionicons name="time-outline" size={20} color={AppColors.violet} /><Text style={styles.detailText}>Times use this device’s current timezone. Reminders without a time are scheduled for 9:00 AM.</Text></View>
          <View style={styles.detailRow}><Ionicons name="sync-outline" size={20} color={AppColors.sun} /><Text style={styles.detailText}>Edits, completion, archive, sign-out, and profile changes automatically remove or replace stale alerts.</Text></View>
        </View>

        {error ? <View accessibilityRole="alert" style={styles.errorBox}><Ionicons name="alert-circle" size={19} color={AppColors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.cloud },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.xl, paddingBottom: Spacing.section, gap: Spacing.xl },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.full, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border },
  headerCopy: { flex: 1 },
  eyebrow: { color: AppColors.violet, fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  title: { color: AppColors.ink, fontFamily: FontFamily?.bold, fontSize: 30, fontWeight: '800', marginTop: 3 },
  subtitle: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  hero: { flexDirection: 'row', gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.xl, backgroundColor: AppColors.ink, ...Shadow.card },
  heroIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: AppColors.paper },
  heroCopy: { flex: 1 },
  heroTitle: { color: AppColors.paper, fontSize: 18, fontWeight: '800' },
  heroText: { color: '#C9D0E0', fontSize: 13, lineHeight: 20, marginTop: 5 },
  card: { gap: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg, backgroundColor: AppColors.paper, borderWidth: 1, borderColor: AppColors.border, ...Shadow.card },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  settingCopy: { flex: 1 },
  sectionTitle: { color: AppColors.ink, fontSize: 18, fontWeight: '800' },
  helper: { color: AppColors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  detailText: { flex: 1, color: AppColors.inkMuted, fontSize: 13, lineHeight: 20 },
  refreshButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.cloud },
  refreshText: { color: AppColors.violet, fontSize: 14, fontWeight: '800' },
  settingsButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: AppColors.violet },
  settingsText: { color: AppColors.paper, fontSize: 14, fontWeight: '800' },
  errorBox: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: AppColors.blushSoft },
  errorText: { flex: 1, color: AppColors.danger, fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.65 },
});
