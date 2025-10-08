import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MiniAlert from '../../components/Component/MiniAlert';
import { darkTheme, lightTheme } from '../../Theme/Auth/ForgetPassTheme';
// Implement this in Firebase file: export async function changeUserEmail(newEmail:string):Promise<{success:boolean; error?:string}>
import { changeUserEmail } from '../../Firebase/Firebase';

const ChangeEmail = () => {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [lockBtn, setLockBtn] = useState(false);
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const themeMode = await AsyncStorage.getItem('ThemeMode');
        setTheme(themeMode === '2' ? darkTheme : lightTheme);
      } catch {}
    };
    const loadUser = async () => {
      try {
        const userString = await AsyncStorage.getItem('UserObject');
        if (userString) {
          const user = JSON.parse(userString);
            if (user?.email) setCurrentEmail(user.email);
        }
      } catch {}
    };
    loadTheme();
    loadUser();
    const id = setInterval(loadTheme, 1000);
    return () => clearInterval(id);
  }, []);

  const showAlert = (m: string, type: 'success' | 'error') => {
    setLockBtn(true);
    setAlertMsg(m);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLockBtn(false);
    }, 3000);
  };

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      showAlert('Please enter new email', 'error');
      return;
    }
    if (!validateEmail(newEmail)) {
      showAlert('Enter a valid email address', 'error');
      return;
    }
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      showAlert('New email is same as current', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await changeUserEmail(newEmail.trim());
      if (res.success) {
        showAlert('Email updated successfully', 'success');
        // Optionally update cached user
        try {
          const userString = await AsyncStorage.getItem('UserObject');
          if (userString) {
            const user = JSON.parse(userString);
            user.email = newEmail.trim();
            await AsyncStorage.setItem('UserObject', JSON.stringify(user));
          }
        } catch {}
        setTimeout(() => router.back(), 3000);
      } else {
        showAlert(res.error || 'Failed to update email', 'error');
        console.log(res.error);
      }
    } catch {
      showAlert('Unexpected error. Try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  const back = () => router.back();

  const styles = StyleSheet.create({
    fl: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', width: '100%', backgroundColor: theme.background },
    container: {
      width: '98%',
      minHeight: Dimensions.get('window').height * 0.3,
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      marginTop: 25
    },
    backbut: {
      paddingTop: 4,
      paddingLeft: 5,
      marginLeft: '2.5%',
      alignSelf: 'flex-start',
      width: 35,
      height: 35,
      borderRadius: 50,
      backgroundColor: theme.backButtonBackground,
      marginBottom: 15
    },
    title: {
      fontSize: 28,
      fontWeight: '600',
      marginBottom: Dimensions.get('window').height * 0.015,
      width: '95%',
      alignSelf: 'center',
      color: theme.primaryText
    },
    currentEmailText: {
      width: '95%',
      marginBottom: 10,
      color: theme.primaryText,
      fontSize: 14,
      opacity: 0.8
    },
    input: {
      width: '95%',
      height: 40,
      backgroundColor: theme.inputBackground,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: Dimensions.get('window').height * 0.01,
      color: theme.primaryText
    },
    button: {
      width: '95%',
      height: 53,
      borderRadius: 100,
      backgroundColor: theme.primaryButton,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Dimensions.get('window').height * 0.01
    },
    buttonText: { color: theme.primaryText, fontWeight: 'bold' },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.loadingOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999
    },
    loadingText: {
      marginTop: 10,
      color: theme.loadingText,
      fontSize: 16,
      fontWeight: '600'
    }
  });

  return (
    <View style={styles.fl}>
      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
        />
      )}
      <View style={styles.container}>
        <TouchableOpacity style={styles.backbut} onPress={back}>
          <Ionicons name="arrow-back" size={24} color={theme.primaryText} />
        </TouchableOpacity>
        <Text style={styles.title}>Change Email</Text>
        {!!currentEmail && (
          <Text style={styles.currentEmailText}>Current: {currentEmail}</Text>
        )}
        <TextInput
          placeholder="New Email Address"
          style={styles.input}
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.primaryText === 'white' ? '#999' : '#555'}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleChangeEmail}
          disabled={lockBtn || loading}
        >
          <Text style={styles.buttonText}>Update Email</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Updating Email...</Text>
        </View>
      )}
    </View>
  );
};

export default ChangeEmail;
