import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import { AuthProvider, useAuthSession } from '@/providers/auth-provider';

const publicRoutes = new Set(['index', 'sign-in', 'consent', 'create-account', 'delete-account', 'privacy-policy', 'join-family']);
const alwaysAccessibleRoutes = new Set(['delete-account', 'privacy-policy', 'join-family', 'verify-email']);
const protectedDetailRoutes = new Set([
  'person',
  'edit-person',
  'manage-relationship',
  'memory',
  'edit-memory',
  'chapter',
  'edit-chapter',
  'reminders',
  'reminder',
  'edit-reminder',
  'privacy',
  'family-access',
]);

function AppNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { user, initializing, setup, setupLoading } = useAuthSession();
  const firstSegment = segments[0] || 'index';

  useEffect(() => {
    if (initializing) {
      return;
    }

    if (alwaysAccessibleRoutes.has(firstSegment)) {
      return;
    }

    if (!user) {
      if (!publicRoutes.has(firstSegment)) {
        router.replace('/');
      }
      return;
    }

    if (!user.emailVerified) {
      if (firstSegment !== 'verify-email') {
        router.replace({ pathname: '/verify-email', params: { email: user.email || '' } });
      }
      return;
    }

    if (setupLoading) {
      return;
    }

    if (!setup?.familyId) {
      if (firstSegment !== 'family') {
        router.replace('/family');
      }
      return;
    }

    if (!setup.onboardingComplete) {
      if (firstSegment !== 'family' && firstSegment !== 'child') {
        router.replace('/child');
      }
      return;
    }

    if (firstSegment !== '(tabs)' && !protectedDetailRoutes.has(firstSegment)) {
      router.replace('/home');
    }
  }, [firstSegment, initializing, router, setup, setupLoading, user]);

  if ((initializing || setupLoading) && !publicRoutes.has(firstSegment)) {
    return (
      <View style={styles.privateLoading}>
        <ActivityIndicator color={AppColors.violet} />
        <Text style={styles.privateLoadingText}>Opening your private LifeBook…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: AppColors.cloud },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="consent" />
        <Stack.Screen name="create-account" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="family" />
        <Stack.Screen name="child" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="person" />
        <Stack.Screen name="edit-person" />
        <Stack.Screen name="manage-relationship" />
        <Stack.Screen name="memory" />
        <Stack.Screen name="edit-memory" />
        <Stack.Screen name="chapter" />
        <Stack.Screen name="edit-chapter" />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="reminder" />
        <Stack.Screen name="edit-reminder" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="family-access" />
        <Stack.Screen name="join-family" />
        <Stack.Screen name="delete-account" />
        <Stack.Screen name="privacy-policy" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  privateLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: AppColors.cloud,
  },
  privateLoadingText: {
    color: AppColors.inkMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
