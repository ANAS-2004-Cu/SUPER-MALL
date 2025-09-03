import { Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router';
import { auth, db } from '../Firebase/Firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import MiniAlert from '../components/MiniAlert';


const Register = () => {

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showpass, setshowpass] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [load, setLoad] = useState(false);

  const router = useRouter();
  let x = /\d/.test(password);
  let hasCapital = /[A-Z]/.test(password);
  let hassmall = /[a-z]/.test(password);
  const hasSpecialChar = /[_@#$%]/.test(password);

  const showAlert = (message, type = 'success') => {
    setLoad(true);
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLoad(false);
    }, 3000);
  };

  const rand = Math.floor(Math.random() * 60) + 1;

  const handleRegister = async () => {
    if (!username || !email || !password) {
      showAlert("Please fill all fields", "error");
      return;
    }
    if (password.length < 8) {
      showAlert("Password must be at least 8 characters.", "error");
      return;
    }
    if (!x || !hasCapital || !hassmall || !hasSpecialChar) {
      if (!x) { showAlert("Password Must Contain a Number.", "error"); }
      else if (!hasCapital) { showAlert("Password Must Contain a Capital Letter", "error"); }
      else if (!hassmall) { showAlert("Password Must Contain Letters", "error"); }
      else if (!hasSpecialChar) { showAlert("Password Must Contain a Special Character Like @,_,%,#,$", "error"); }
      return;
    }
    setLoading(true);

    try {
      const q = query(collection(db, 'Users'), where('username', '==', username))
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {

        const createUser = await createUserWithEmailAndPassword(auth, email, password);
        const user = createUser.user;
        await setDoc(doc(db, "Users", user.uid), {
          username,
          email: email.trim(),
          uid: user.uid,
          image: `https://randomuser.me/api/portraits/men/${rand}.jpg`,
          isAdmin: false,
          isBlocked: false,
        });

        showAlert("User created successfully", "success");
        router.push({ pathname: '/Onboarding', params: { fromRegister: true, userId: user.uid } });
      }
      else {
        showAlert("Username is already used", "error");
      }
    } catch (error) {
      if (error.message === "Firebase: Error (auth/email-already-in-use).") {
        showAlert("This email already exists", "error");
      }
      else if (error.message === "Firebase: Error (auth/invalid-email).") {
        showAlert("Wrong format of email", "error");
      }
      else {
        showAlert(error.message, "error");
      }
    }
    setLoading(false);
  }

  const back = () => {
    router.back();
  }

  const reset = () => {
    router.push('/ForgetPass');

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
        <Text style={styles.title}>Create Account</Text>
        <TextInput placeholder="Username" style={styles.input} value={username} onChangeText={setUsername} />
        <TextInput placeholder="Email Address" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
        <View style={styles.pass}>
          <TextInput style={styles.passinput} placeholder="Password" secureTextEntry={showpass} value={password} onChangeText={setPassword} />
          {password.length != 0 && <TouchableOpacity style={styles.passbutt} onPress={() => setshowpass(!showpass)}>
            <Icon name={showpass ? 'eye-slash' : 'eye'} size={24} color="black" />
          </TouchableOpacity>}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={load}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
        <View style={styles.semif}>

          <Text style={styles.text}>Forgot Password?</Text>

          <TouchableOpacity style={styles.createButton} onPress={reset}>
            <Text style={styles.createButtonText}>Reset</Text>

          </TouchableOpacity>
        </View>


      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Creating your account...</Text>
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
    zIndex: -1,
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
  text: {
    marginTop: Dimensions.get('window').height * 0.015,
  },
  createButton: {
    marginTop: Dimensions.get('window').height * 0.015,
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
    marginTop: Dimensions.get('window').height * 0.01,
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

