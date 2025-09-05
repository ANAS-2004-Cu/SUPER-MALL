import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MiniAlert from '../../components/MiniAlert';
import { getUserData, signIn } from '../../Firebase/Firebase';

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
  const router = useRouter();

  const showAlert = (message, type = 'success') => {
    setLoad(true);
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLoad(false);
    }, 3000);
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

  const openWhatsApp = () => {
    const whatsappUrl = 'https://wa.me/201032672532';
    Linking.openURL(whatsappUrl).catch(err => console.error('Error opening WhatsApp:', err));
  };

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
        <Text style={styles.title}>Sign in</Text>

        <TextInput
          placeholder="Email Address"
          style={styles.input}
          value={email}
          onChangeText={(text) => setEmail(text)}
          keyboardType="email-address"
        />

        <View style={styles.pass}>
          <TextInput style={styles.passinput} placeholder="Password" secureTextEntry={showpass} value={password} onChangeText={setPassword} />
          {password.length != 0 && <TouchableOpacity style={styles.passbutt} onPress={() => setshowpass(!showpass)}>
            <Icon name={showpass ? 'eye-slash' : 'eye'} size={24} color="black" />
          </TouchableOpacity>}
        </View>


        <TouchableOpacity style={styles.button} onPress={signin} disabled={load}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        <View style={styles.semif}>

          <Text style={styles.text}>Don&apos;t have an account?</Text>

          <TouchableOpacity style={styles.createButton} onPress={reg}>
            <Text style={styles.createButtonText}>Create One</Text>

          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button1}>
          <FontAwesome name='google' size={30} style={styles.icon}></FontAwesome>

          <Text style={styles.button1text}>Continue With Google</Text>

        </TouchableOpacity>
        <TouchableOpacity style={styles.button1} >
          <FontAwesome name='facebook' color='white' size={25} style={styles.faceicon}></FontAwesome>

          <Text style={styles.button1text}>Continue With Facebook</Text>

        </TouchableOpacity>
      </View>

      {showCustomerService && (
        <TouchableOpacity style={styles.customerServiceButton} onPress={openWhatsApp}>
          <FontAwesome name="whatsapp" size={24} color="white" />
          <Text style={styles.customerServiceText}>Customer Service</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Please wait...</Text>
        </View>
      )}
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
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
    backgroundColor: 'rgb(226, 226, 226)',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: Dimensions.get('window').height * 0.01,
    zIndex: -1,
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
  button1: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '95%',
    height: 53,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    backgroundColor: 'rgb(236, 235, 235)',
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
    borderColor: '#ccc',
    justifyContent: 'center',
    backgroundColor: 'rgb(236, 235, 235)',
    position: 'relative',

    marginTop: Dimensions.get('window').height * 0.06,

  },
  button1text: {
    color: 'black',
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  text: {
    marginTop: Dimensions.get('window').height * 0.02,
  },
  createButton: {
    marginTop: Dimensions.get('window').height * 0.02,
  },
  createButtonText: {
    fontWeight: 'bold',
    color: 'black',
  },
  semif: {
    width: '95%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: Dimensions.get('window').height * 0.005,

  },
  fl: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    position: 'absolute',
    left: '3%',
  },
  faceicon: {
    position: 'absolute',
    left: '3%',

    borderRadius: 50,
    width: 35,
    height: 35,
    backgroundColor: 'rgb(24, 119, 242)',

    textAlign: 'center',
    textAlignVertical: 'center',

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
  customerServiceButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
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
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 14,
  },
});



