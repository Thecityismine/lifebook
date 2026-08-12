import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors, Radius, Shadow } from '@/constants/theme';

// Height of the bar above the bottom inset: room for the icon, the label, and the
// 8px of padding above them.
const tabBarContentHeight = Platform.select({ ios: 66, android: 62, default: 66 });
// What the bar reserves at the bottom on a device with no home indicator.
const minimumBottomInset = Platform.select({ ios: 22, android: 10, default: 10 });

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
    <View style={styles.addButtonDock}>
      <View style={[styles.addButton, focused && styles.addButtonActive]}>
        <Ionicons name="add" size={30} color={AppColors.onAccent} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  // The navigator already pads the bar by insets.bottom, but an explicit height or
  // paddingBottom in tabBarStyle is spread over that and wins, so the bar has to
  // fold the inset in itself. Without this the bar keeps its home-button size on a
  // home-indicator device and stops short of the bottom of the screen.
  const bottomInset = Math.max(insets.bottom, minimumBottomInset);

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
          tabBarStyle: [
            styles.tabBar,
            {
              height: tabBarContentHeight + bottomInset,
              paddingBottom: bottomInset,
            },
          ],
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
            tabBarLabel: () => null,
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
    paddingTop: 8,
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
  addButtonDock: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 66,
    height: 66,
    marginTop: -32,
    borderRadius: 33,
    backgroundColor: AppColors.paper,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: AppColors.violet,
    borderWidth: 2,
    borderColor: AppColors.violet,
    ...Shadow.floating,
  },
  addButtonActive: {
    backgroundColor: AppColors.violetDark,
    transform: [{ scale: 0.96 }],
  },
});
