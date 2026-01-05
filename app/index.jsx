import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';
import { fetchManageDocs, getUserData } from '../Backend/Firebase/DBAPI';
import { useUserStore } from '../Backend/Zustand/UserStore';

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
                  router.replace('./Admin/Admintabs/Admin');
                } else {
                  router.replace('./User/(MainTaps)/Home');
                }
              } else {
                router.replace('./User/(MainTaps)/Home');
              }
            } catch (_error) {
              Alert.alert('Error', 'A connection error occurred. Please try again later.', [{ text: 'OK', onPress: () => BackHandler.exitApp() }], { cancelable: false });
            }
          } else {
            router.replace('./User/(MainTaps)/Home');
          }
        } catch (_error) {
          Alert.alert('Error', 'A connection error occurred. Please try again later.', [{ text: 'OK', onPress: () => BackHandler.exitApp() }], { cancelable: false });
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