import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../store/userStore';
import { getUserData,fetchManageDocs } from './services/DBAPI';

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
          const loginId = await AsyncStorage.getItem('LoginID');
          const manageResponse = await fetchManageDocs();
          await AsyncStorage.setItem('unUpadtingManageDocs', JSON.stringify(manageResponse.unUpadtingManageDocs));
          await AsyncStorage.setItem('UpadtingManageDocs', JSON.stringify(manageResponse.UpadtingManageDocs));
          if (loginId) {
            try {
              const userData = await getUserData(loginId);
              if (userData) {
                useUserStore.getState().login(userData);
                
                if (userData.isAdmin === true) {
                  router.replace('./Admintabs');
                } else {
                  router.replace('/(tabs)/home');
                }
              } else {
                router.replace('/(tabs)/home');
              }
            } catch (_error) {
                Alert.alert('Error', 'A connection error occurred. Please try again later.');
            }
          } else {
            router.replace('/(tabs)/home');
          }
        } catch (_error) {
            Alert.alert('Error', 'A connection error occurred. Please try again later.');
        }
      }, 5000);
    };

    handleNavigation();
  }, [router, titleAnimation]);

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