import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MiniAlert from '../../components/Component/MiniAlert';
import { resetPassword } from '../../Firebase/Firebase';
import { darkTheme, lightTheme } from '../../Theme/Auth/ForgetPassTheme';

const ForgetPass = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [load, setLoad] = useState(false);
  const [theme, setTheme] = useState(lightTheme);

  // Load theme from AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const themeMode = await AsyncStorage.getItem('ThemeMode');
        if (themeMode === '2') {
          setTheme(darkTheme);
        } else {
          setTheme(lightTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    
    loadTheme();
    
    // Listen for theme changes
    const intervalId = setInterval(loadTheme, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const showAlert = (message: React.SetStateAction<string | null>, type: 'success' | 'error') => {
    setLoad(true);
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLoad(false);
    }, 3000);
  };

  const handleResetPassword = async () => {
    if (!email) {
      showAlert("Please enter your email", "error");
      return;
    }

    // Trim whitespace but keep original case for validation
    const trimmedEmail = email.trim();

    // Basic email validation with original email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showAlert("Please enter a valid email address", "error");
      return;
    }

    setLoading(true);

    try {
      // Pass original email - Firebase function will handle case conversion
      const result = await resetPassword(trimmedEmail);
      
      if (result.success) {
        showAlert("Reset password link sent to your email", "success");
        setTimeout(() => {
          back();
        }, 3000);
      } else {
        showAlert(result.error || "Failed to send reset password email", "error");
      }
    } catch (err) {
      showAlert("An unexpected error occurred. Please try again", "error");
    } finally {
      setLoading(false);
    }
  };

  const back = () => {
    router.back();
  }

  // Create styles with the current theme
  const dynamicStyles = StyleSheet.create({
    fl: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      width: '100%',
      backgroundColor: theme.background,
    },
    container: {
      width: '98%',
      minHeight: Dimensions.get('window').height * 0.3,
      justifyContent: 'center',
      alignContent: 'center',
      alignItems: 'center',
      marginTop: 25,
    },
    button: {
      width: '95%',
      height: 53,
      borderRadius: 100,
      backgroundColor: theme.primaryButton,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Dimensions.get('window').height * 0.01,
    },
    buttonText: {
      color: theme.primaryText,
      fontWeight: 'bold',
    },
    input: {
      width: '95%',
      height: 40,
      backgroundColor: theme.inputBackground,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: Dimensions.get('window').height * 0.01,
      color: theme.primaryText,
    },
    title: {
      fontSize: 30,
      fontWeight: 400,
      marginBottom: Dimensions.get('window').height * 0.02,
      width: '95%',
      alignSelf: 'center',
      color: theme.primaryText,
    },
    backbut: {
      paddingTop: 4,
      paddingLeft: 5,
      marginLeft: '2.5%',
      alignSelf: "flex-start",
      width: 35,
      height: 35,
      borderRadius: 50,
      backgroundColor: theme.backButtonBackground,
      marginBottom: 15
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.loadingOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    loadingText: {
      marginTop: 10,
      color: theme.loadingText,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={dynamicStyles.fl}>
      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
        />
      )}
      <View style={dynamicStyles.container}>
        <TouchableOpacity style={dynamicStyles.backbut} onPress={back}>
          <Ionicons name="arrow-back" size={24} color={theme.primaryText} />
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>Forgot Password</Text>
        <TextInput 
          placeholder="Email Address" 
          style={dynamicStyles.input} 
          value={email}
          onChangeText={setEmail} 
          keyboardType="email-address"
          placeholderTextColor={theme.primaryText === 'white' ? '#999' : '#555'}
        />
        <TouchableOpacity style={dynamicStyles.button} onPress={handleResetPassword} disabled={load}>
          <Text style={dynamicStyles.buttonText}>continue</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={dynamicStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={dynamicStyles.loadingText}>Sending Reset Password Email...</Text>
        </View>
      )}
    </View>
  )
}

export default ForgetPass

