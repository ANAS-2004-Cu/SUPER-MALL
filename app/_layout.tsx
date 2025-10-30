import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

const Layout = () => {
  useEffect(() => {
    // Hide navigation bar on Android
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      // Optionally, you can set behavior for when user swipes up
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="Authentication/Login" />
        <Stack.Screen name="Authentication/Register" />
        <Stack.Screen name="Authentication/ForgetPass" />
        <Stack.Screen name="Onboarding" />
        <Stack.Screen name="CategorySelection" />
        <Stack.Screen name="About" />
        <Stack.Screen name="products" />
        <Stack.Screen name="Admintabs" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="(ProfileTabs)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="Settings" />
        <Stack.Screen name="singlepage" />
      </Stack>
  );
};

export default Layout;