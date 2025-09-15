import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MiniAlert from '../../components/Component/MiniAlert';
import { getCollection, getUserData, signIn } from '../../Firebase/Firebase';
import { darkTheme, lightTheme } from '../../Theme/Auth/LoginTheme';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showpass, setshowpass] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [load, setLoad] = useState(false);
  const [showCustomerService, setShowCustomerService] = useState(false);
  const [theme, setTheme] = useState(lightTheme);
  const router = useRouter();

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

  const showAlert = (message, type = 'success') => {
    setLoad(true);
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLoad(false);
    }, 3000);
  };

  const syncCategoriesAndAvailableCategory = async (userData) => {
    // Sync preferred categories
    if (userData?.preferredCategories && userData.preferredCategories.length > 0) {
      await AsyncStorage.setItem('categories', JSON.stringify(userData.preferredCategories));
    }
    // Sync AvilableCategory from ProductsManage collection
    try {
      const response = await getCollection("ProductsManage");
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        const doc = response.data[0];
        const rawCats =
          doc.AvilableCategory ;
        if (rawCats !== null) {
          await AsyncStorage.setItem('AvilableCategory', JSON.stringify(rawCats));
        }
      }
    } catch (e) {
      // ignore errors
    }
  };

  const signin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill all fields');
      showAlert('Please write email and password', 'error');
      return;
    }
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.success) {
        const user = result.user;
        const userData = await getUserData(user.uid);

        if (userData) {
          await AsyncStorage.setItem('UserObject', JSON.stringify(userData));
          // --- Sync categories and AvilableCategory after login ---
          await syncCategoriesAndAvailableCategory(userData);

          if (userData?.isAdmin === true) {
            router.replace('./Admintabs');
            router.push('./Admintabs/Admin');
          }
          else if (userData?.isBlocked === true) {
            showAlert('This Account is Blocked , Contact With Customer Service', 'error');
            setShowCustomerService(true);
          }
          else {
            router.replace('/(tabs)');
            router.push('/home');
          }
        } else {
          setError('User not found.');
          showAlert('User not found', 'error');
        }
      } else {
        setError(result.error);
        showAlert(result.error, 'error');
      }

    } catch (error) {
      setError('An unexpected error occurred');
      showAlert('An unexpected error occurred', 'error');
    }
    setLoading(false);
  }

  const reg = () => {
    router.push('/Authentication/Register');
  }

  const forgotPassword = () => {
    router.push('/Authentication/ForgetPass');
  }

  const openWhatsApp = () => {
    const whatsappUrl = 'https://wa.me/201032672532';
    Linking.openURL(whatsappUrl).catch(err => console.error('Error opening WhatsApp:', err));
  };

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
      minHeight: Dimensions.get('window').height * 0.8,
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
      backgroundColor: theme.inputBackground,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: Dimensions.get('window').height * 0.01,
      color: theme.primaryText,
    },
    passbutt: {
      marginHorizontal: -40,
      marginVertical: 7,
    },
    title: {
      fontSize: 30,
      fontWeight: 400,
      marginBottom: 20,
      width: '95%',
      alignSelf: 'center',
      color: theme.primaryText,
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
    button: {
      width: '95%',
      height: 53,
      borderRadius: 100,
      backgroundColor: theme.primaryButton,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Dimensions.get('window').height * 0.01,
    },
    button1: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '95%',
      height: 53,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: theme.borderColor,
      justifyContent: 'center',
      backgroundColor: theme.secondaryButton,
      position: 'relative',
      marginTop: Dimensions.get('window').height * 0.01,
    },
    button1a: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '95%',
      height: 53,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: theme.borderColor,
      justifyContent: 'center',
      backgroundColor: theme.secondaryButton,
      position: 'relative',
      marginTop: Dimensions.get('window').height * 0.06,
    },
    button1text: {
      color: theme.primaryText,
      fontWeight: 'bold',
    },
    buttonText: {
      color: theme.primaryText,
      fontWeight: 'bold',
    },
    text: {
      marginTop: Dimensions.get('window').height * 0.02,
      color: theme.primaryText,
    },
    createButton: {
      marginTop: Dimensions.get('window').height * 0.02,
    },
    createButtonText: {
      fontWeight: 'bold',
      color: theme.primaryText,
    },
    semif: {
      width: '95%',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      marginTop: Dimensions.get('window').height * 0.005,
    },
    icon: {
      position: 'absolute',
      left: '3%',
      color: theme.iconColor,
    },
    faceicon: {
      position: 'absolute',
      left: '3%',
      borderRadius: 50,
      width: 35,
      height: 35,
      backgroundColor: theme.facebookBackground,
      textAlign: 'center',
      textAlignVertical: 'center',
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
    customerServiceButton: {
      position: 'absolute',
      bottom: 30,
      left: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.customerServiceButton,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 25,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    customerServiceText: {
      color: theme.customerServiceText,
      marginLeft: 8,
      fontWeight: 'bold',
      fontSize: 14,
    },
    forgotPasswordText: {
      color: theme.primaryText,
      textAlign: 'right',
      alignSelf: 'flex-end',
      marginBottom: 5,
      marginRight: 10,
      fontSize: 12,
      fontWeight: '400',
      opacity: 0.8,
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
        <Text style={dynamicStyles.title}>Sign in</Text>

        <TextInput
          placeholder="Email Address"
          style={dynamicStyles.input}
          value={email}
          onChangeText={(text) => setEmail(text)}
          keyboardType="email-address"
          textContentType="emailAddress"  
          autoComplete="email"           
          autoCapitalize="none"         
          autoCorrect={false}            
          placeholderTextColor={theme.primaryText === 'white' ? '#999' : '#555'}
        />

        <View style={dynamicStyles.pass}>
          <TextInput
            style={dynamicStyles.passinput}
            placeholder="Password"
            secureTextEntry={showpass}
            value={password}
            onChangeText={setPassword}
            textContentType="password"   
            autoComplete="password"    
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={theme.primaryText === 'white' ? '#999' : '#555'}
          />
          {password.length !== 0 && (
            <TouchableOpacity
              style={dynamicStyles.passbutt}
              onPress={() => setshowpass(!showpass)}
            >
              <Icon
                name={showpass ? 'eye-slash' : 'eye'}
                size={24}
                color={theme.iconColor}
              />
            </TouchableOpacity>
          )}
        </View>


        <View style={{ width: '95%', alignItems: 'flex-end' }}>
          <TouchableOpacity onPress={forgotPassword}>
            <Text style={dynamicStyles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={dynamicStyles.button} onPress={signin} disabled={load}>
          <Text style={dynamicStyles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        <View style={dynamicStyles.semif}>
          <Text style={dynamicStyles.text}>Don&apos;t have an account?</Text>
          <TouchableOpacity style={dynamicStyles.createButton} onPress={reg}>
            <Text style={dynamicStyles.createButtonText}>Create One</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={dynamicStyles.button1} onPress={() => router.push('/(tabs)/profile')}>
          <FontAwesome name='google' size={30} style={dynamicStyles.icon}></FontAwesome>
          <Text style={dynamicStyles.button1text}>Continue With Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.button1} >
          <FontAwesome name='facebook' color='white' size={25} style={dynamicStyles.faceicon}></FontAwesome>
          <Text style={dynamicStyles.button1text}>Continue With Facebook</Text>
        </TouchableOpacity>
      </View>

      {showCustomerService && (
        <TouchableOpacity style={dynamicStyles.customerServiceButton} onPress={openWhatsApp}>
          <FontAwesome name="whatsapp" size={24} color="white" />
          <Text style={dynamicStyles.customerServiceText}>Customer Service</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={dynamicStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={dynamicStyles.loadingText}>Please wait...</Text>
        </View>
      )}
    </View>
  );
};

export default Login;



