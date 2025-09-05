import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MiniAlert from '../../components/MiniAlert';
import { resetPassword } from '../../Firebase/Firebase';

const ForgetPass = () => {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [load, setLoad] = useState(false);

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
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>Forgot Password</Text>
        <TextInput placeholder="Email Address" style={styles.input} value={email}
          onChangeText={setEmail} keyboardType="email-address" />
        <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={load}>
          <Text style={styles.buttonText}>continue</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Sending Reset Password Email...</Text>
        </View>
      )}
    </View>
  )
}

export default ForgetPass
const styles = StyleSheet.create({
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
    backgroundColor: 'rgb(247, 207, 174)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Dimensions.get('window').height * 0.01,
  },
  buttonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  input: {
    width: '95%',
    height: 40,
    backgroundColor: 'rgb(226, 226, 226)',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: Dimensions.get('window').height * 0.01,

  },
  title: {
    fontSize: 30,
    fontWeight: 400,
    marginBottom: Dimensions.get('window').height * 0.02,
    width: '95%',
    alignSelf: 'center',
  },
  backbut: {
    paddingTop: 4,
    paddingLeft: 5,
    marginLeft: '2.5%',
    alignSelf: "flex-start",
    width: 35,
    height: 35,
    borderRadius: 50,
    backgroundColor: 'rgb(231, 227, 227)',
    marginBottom: 15
  },
  fl: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 10,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})

