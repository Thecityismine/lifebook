import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppColors } from '@/constants/theme';
import { AuthProvider, useAuthSession } from '@/providers/auth-provider';

const publicRoutes = new Set(['index', 'sign-in', 'consent', 'create-account']);
const protectedDetailRoutes = new Set(['person', 'edit-person', 'manage-relationship']);

function AppNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { user, initializing, setup, setupLoading } = useAuthSession();
  const firstSegment = segments[0] || 'index';

  useEffect(() => {
    if (initializing) {
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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
