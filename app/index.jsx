import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const WelcomeScreen = () => {
  const router = useRouter();
  const titleAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.timing(titleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }, 1500);

    const handleNavigation = async () => {
      setTimeout(async () => {
        try {
          const userDataObject = await AsyncStorage.getItem('UserObjects');
          const isAdminString = false;
          
          if (userDataObject) {
            const isAdmin = isAdminString === 'true';
            
            if (isAdmin) {
              console.log("Admin user found, redirecting to admin panel");
              router.replace('./Admintabs');
            } else {
              console.log("Regular user found, redirecting to user home");
              router.replace('/(tabs)');
              router.push('/home');
            }
          } else {
            console.log("No user data found, redirecting to login");
            router.replace('/Authentication/Login');
          }
        } catch (error) {
          console.error('Error reading AsyncStorage:', error);
          router.replace('/Authentication/Login');
        }
      }, 5000);
    };

    handleNavigation();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.content}>
          <Image source={require('../assets/images/cart.gif')} style={styles.logo} />
          <Animated.Text 
            style={[
              styles.title, 
              { opacity: titleAnimation }
            ]}
          >
            SUPERMALL
          </Animated.Text>
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
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
});

export default WelcomeScreen;