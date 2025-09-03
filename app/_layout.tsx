import { Stack, Slot } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { CartProvider } from './item/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import { auth } from '../Firebase/Firebase';

const Layout = () => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function prepareApp() {
      try {
        const onboardingComplete = await AsyncStorage.getItem('@onboarding_complete');
        
        if (onboardingComplete !== 'true') {
          setInitialRoute('Onboarding');
        } else {
          const user = auth.currentUser;
          if (!user) {
            setInitialRoute('Login');
          } else {
            setInitialRoute('(tabs)/home');
          }
        }
      } catch (error) {
        console.error('Error preparing app:', error);
        setInitialRoute('Login');
      } finally {
        setAppIsReady(true);
      }
    }

    prepareApp();
  }, []);

  if (!appIsReady || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="rgb(247, 207, 174)" />
      </View>
    );
  }

  return (
    <CartProvider>
      <Stack initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="Login" />
        <Stack.Screen name="Register" />
        <Stack.Screen name="ForgetPass" />
        <Stack.Screen name="Onboarding" />
        <Stack.Screen name="CategorySelection" />
        <Stack.Screen name="About" />
        <Stack.Screen name="products" />
        <Stack.Screen name="Admintabs" />
        <Stack.Screen name="Search" />
        <Stack.Screen name="cart" />
        <Stack.Screen name="(ProfileTabs)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="Settings" />
        <Stack.Screen name="singlepage" />
        <Stack.Screen name="DisplayCategories" />
      </Stack>
    </CartProvider>
  );
};

export default Layout;