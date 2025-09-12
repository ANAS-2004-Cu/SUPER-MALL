import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MiniAlert from '../../components/Component/MiniAlert';
import { createQuery, getCollection, getUserData, signUp } from '../../Firebase/Firebase';
import { darkTheme, lightTheme } from '../../Theme/Auth/RegisterTheme';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showpass, setshowpass] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [theme, setTheme] = useState(lightTheme);

  const router = useRouter();

  // Load theme preference from AsyncStorage
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
  }, []);

  const showAlert = (message, type = 'success') => {
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
    }, 3000);
  };

  const validatePassword = (password) => {
    const hasNumber = /\d/.test(password);
    const hasCapital = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecialChar = /[_@#$%]/.test(password);

    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!hasNumber) return "Password Must Contain a Number.";
    if (!hasCapital) return "Password Must Contain a Capital Letter";
    if (!hasLower) return "Password Must Contain Letters";
    if (!hasSpecialChar) return "Password Must Contain a Special Character Like @,_,%,#,$";
    return null;
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      showAlert("Please fill all fields", "error");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      showAlert(passwordError, "error");
      return;
    }

    setLoading(true);

    try {
      const usernameQuery = createQuery('username', '==', username);
      const existingUsers = await getCollection('Users', [usernameQuery]);
      
      if (existingUsers.success && existingUsers.data.length > 0) {
        showAlert("Username is already used", "error");
        setLoading(false);
        return;
      }

      const userData = {
        username,
        image: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 60) + 1}.jpg`,
        isAdmin: false,
        isBlocked: false,
      };

      const result = await signUp(email, password, userData);
      await AsyncStorage.setItem('UserObject', JSON.stringify(await getUserData(result.user.uid)));

      if (result.success) {
        showAlert("User created successfully", "success");
        router.replace('/(tabs)');
        router.push('/home');
      } else {
        if (result.error.includes("email-already-in-use")) {
          showAlert("This email already exists", "error");
        } else if (result.error.includes("invalid-email")) {
          showAlert("Wrong format of email", "error");
        } else {
          showAlert(result.error, "error");
        }
      }
    } catch (error) {
      showAlert("An unexpected error occurred", "error");
    }
    setLoading(false);
  }

  return (
    <View style={[styles.fl, { backgroundColor: theme.backgroundColor }]}>
      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
        />
      )}

      <View style={styles.container}>
        <TouchableOpacity 
          style={[styles.backbut, { backgroundColor: theme.backButtonBackground }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.iconColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textColor }]}>Create Account</Text>
        <TextInput 
          placeholder="Username" 
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.textColor }]} 
          value={username} 
          onChangeText={setUsername}
          placeholderTextColor={theme.textColor === 'white' ? '#AAA' : '#666'} 
        />
        <TextInput 
          placeholder="Email Address" 
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.textColor }]} 
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address"
          placeholderTextColor={theme.textColor === 'white' ? '#AAA' : '#666'} 
        />
        <View style={styles.pass}>
          <TextInput 
            style={[styles.passinput, { backgroundColor: theme.inputBackground, color: theme.textColor }]} 
            placeholder="Password" 
            secureTextEntry={showpass} 
            value={password} 
            onChangeText={setPassword}
            placeholderTextColor={theme.textColor === 'white' ? '#AAA' : '#666'} 
          />
          {password.length > 0 && <TouchableOpacity style={styles.passbutt} onPress={() => setshowpass(!showpass)}>
            <Icon name={showpass ? 'eye-slash' : 'eye'} size={24} color={theme.iconColor} />
          </TouchableOpacity>}
        </View>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.buttonBackground }]} 
          onPress={handleRegister} 
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: theme.textColor }]}>Register</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.loadingOverlayBackground }]}>
          <ActivityIndicator size="large" color={theme.loadingTextColor} />
          <Text style={[styles.loadingText, { color: theme.loadingTextColor }]}>Creating your account...</Text>
        </View>
      )}
    </View>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    width: '98%',
    minHeight: Dimensions.get('window').height * 0.5,
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
  },
  pass: {
    width: '95%',
    flexDirection: 'row',
  },
  passinput: {
    width: '100%',
    height: 40,
    backgroundColor: 'rgb(226, 226, 226)',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: Dimensions.get('window').height * 0.01,
  },
  passbutt: {
    marginHorizontal: -40,
    marginVertical: 7,
  },
  title: {
    fontSize: 30,
    fontWeight: 400,
    marginBottom: Dimensions.get('window').height * 0.02,
    width: '95%',
    alignSelf: 'center',
  },
  input: {
    width: '95%',
    height: 40,
    backgroundColor: 'rgb(226, 226, 226)',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: Dimensions.get('window').height * 0.01,
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
  backbut: {
    paddingTop: 4,
    paddingLeft: 5,
    marginLeft: '2.5%',
    alignSelf: "flex-start",
    width: 35,
    height: 35,
    borderRadius: 50,
    backgroundColor: 'rgb(231, 227, 227)',
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
});

