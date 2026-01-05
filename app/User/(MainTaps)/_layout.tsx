import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Hide navigation bar on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  const loadTheme = async () => {
    try {
      const value = await AsyncStorage.getItem('ThemeMode');
      if (value === '2') {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    } catch (e) {
      console.log("Error loading theme", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTheme();

      // Ensure navigation bar stays hidden when this screen is focused
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('hidden');
      }
    }, [])
  );

  const isLight = theme === 'light';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isLight ? '#007AFF' : '#4da6ff',
        tabBarInactiveTintColor: isLight ? '#8e8e93' : '#9e9e9e',
        tabBarStyle: {
          backgroundColor: isLight ? '#ffffff' : '#1e1e1e',
          borderTopLeftRadius: isLight ? 0 : 0,
          borderTopRightRadius: isLight ? 0 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isLight ? 0.08 : 0.4,
          shadowRadius: 10,
          elevation: 20,
          height: Platform.OS === 'ios' ? 75 : 75,
          paddingBottom: Platform.OS === 'ios' ? 15 : 10,
          borderTopWidth: 0,
          paddingTop: 2,
          position: 'relative',
          left: 0,
          right: 0,
          bottom: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
          color: isLight ? '#333' : '#f2f2f2',
        },
      }}
    >
      <Tabs.Screen
        name='Home'
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={26} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name='Products'
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pricetags' : 'pricetags-outline'} size={24} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name='ChatBot'
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome5 name="robot" size={24} color={color} solid={focused} />
          )
        }}
      />
      <Tabs.Screen
        name='Profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={25} color={color} />
          )
        }}
      />
    </Tabs>
  );
}
