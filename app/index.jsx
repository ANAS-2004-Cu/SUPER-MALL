import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WelcomeScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('DataForUser');
        const userData = userDataString ? JSON.parse(userDataString) : null;

        if (userData) {
          console.log("User data found:", userData);
          if (userData.isAdmin) {
            router.replace('./Admintabs');
            router.push('./Admintabs/Admin');
          } else {
            router.replace('/(tabs)');
            router.push('/home');
          }
        } else {
          setTimeout(() => {
            router.replace('/Login');
          }, 3000);
        }
      } catch (error) {
        console.error('Error reading AsyncStorage:', error);
        setTimeout(() => {
          router.replace('/Login');
        }, 3000);
      }
    };

    checkLoginStatus();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.content}>
          <Image source={require('../assets/images/pngwing.com.png')} style={styles.logo} />
          <Text style={styles.title}>SUPERMALL</Text>
          <ActivityIndicator
            size="large"
            color="#4A3222"
            style={styles.loader}
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAE5D3',
    paddingHorizontal: 20,
  },
  content: {
    bottom: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#4A3222',
    marginTop: 1,
  },
  logo: {
    width: 90,
    height: 100,
    resizeMode: 'contain',
  },
  loader: {
    marginTop: 20,
  }
});

export default WelcomeScreen;