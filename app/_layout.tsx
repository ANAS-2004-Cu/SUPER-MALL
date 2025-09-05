import { Stack } from 'expo-router';
import React from 'react';
import { CartProvider } from './item/CartContext';

const Layout = () => {
  return (
    <CartProvider>
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