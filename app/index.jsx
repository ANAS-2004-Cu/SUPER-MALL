import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../store/userStore';
import { getUserData,fetchManageDocs } from './services/DBAPI';

const WelcomeScreen = () => {
  const router = useRouter();

  useEffect(() => {
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
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View>
          <Image source={require('../assets/images/Logo.gif')} style={styles.logo} />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: "100%",
    height: "100%",
  },
});

export default WelcomeScreen;