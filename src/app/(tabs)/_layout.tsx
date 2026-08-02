import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { ColorValue } from 'react-native';

import { AppColors, Radius, Shadow } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  return (
    <View style={[styles.iconFrame, focused && styles.iconFrameActive]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

function AddIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.addButton, focused && styles.addButtonActive]}>
      <Ionicons name="add" size={30} color={AppColors.onAccent} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: styles.scene,
          tabBarActiveTintColor: AppColors.violet,
          tabBarInactiveTintColor: AppColors.slate,
          tabBarHideOnKeyboard: true,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: styles.tabBar,
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: 'People',
            tabBarAccessibilityLabel: 'People',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'people' : 'people-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add',
            tabBarAccessibilityLabel: 'Add something to LifeBook',
            tabBarIcon: ({ focused }) => <AddIcon focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="chapters"
          options={{
            title: 'Chapters',
            tabBarAccessibilityLabel: 'Chapters',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'book' : 'book-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="memories"
          options={{
            title: 'Memories',
            tabBarAccessibilityLabel: 'Memories',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'heart' : 'heart-outline'} color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: AppColors.cloud,
  },
  tabBar: {
    height: Platform.select({ ios: 88, android: 72, default: 76 }),
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: 22, android: 10, default: 10 }),
    backgroundColor: AppColors.paper,
    borderTopColor: AppColors.border,
    ...Shadow.navigation,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 30,
    borderRadius: Radius.full,
  },
  iconFrameActive: {
    backgroundColor: AppColors.violetSoft,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    marginTop: -20,
    borderRadius: 26,
    backgroundColor: AppColors.violet,
    borderWidth: 4,
    borderColor: AppColors.onDark,
    ...Shadow.floating,
  },
  addButtonActive: {
    backgroundColor: AppColors.violetDark,
    transform: [{ scale: 0.96 }],
  },
});
