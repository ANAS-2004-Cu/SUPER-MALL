import { Stack, router } from 'expo-router';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, Dimensions, ScrollView, Modal, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useEffect, useState, useRef } from 'react'
import { auth, getUserData } from '../../Firebase/Firebase';
import { doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../Firebase/Firebase";
import MiniAlert from '../../components/MiniAlert';
import { Ionicons, FontAwesome, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableWithoutFeedback, Animated } from 'react-native';

const { width } = Dimensions.get('window');

const EditProfile = () => {
  const [image, setImage] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [fullname, setFullname] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [num, setNum] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [load, setLoad] = useState<boolean>(false);
  const IMGBB_API_KEY = "5f368fdc294d3cd3ddc0b0e9297a10fb";
  const [imageSourceModalVisible, setImageSourceModalVisible] = useState<boolean>(false);

  const [errors, setErrors] = useState<{
    username?: string;
    fullname?: string;
    phone?: string;
  }>({});


  const showImageOptions = () => {
    setImageSourceModalVisible(true);
  };

  const pickImageFromGallery = async () => {
    setImageSourceModalVisible(false);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhotoWithCamera = async () => {
    setImageSourceModalVisible(false);

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      setAlertMessage("Camera permission is required to take photos.");
      setAlertType("error");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const SaveButton = () => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const pressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const pressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableWithoutFeedback
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={validateAndUpdate}
        disabled={load}
      >
        <Animated.View
          style={[
            styles.button,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {load ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
          ) : (
            <View style={styles.iconContainer}>
              <MaterialIcons name="save" size={24} color="#fff" />
            </View>
          )}
          <Text style={styles.buttonText}>
            {load ? "Saving..." : "Save Changes"}
          </Text>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const data = await getUserData(currentUser.uid);
        setUserData(data);
      }
    };

    fetchUserData();
  }, []);

  const uploadImageToImgbb = async (uri: string) => {
    const formData = new FormData();
    formData.append("image", {
      uri,
      type: "image/jpeg",
      name: "profile.jpg",
    } as any);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();
    return data.data.url;
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors: {
      username?: string;
      fullname?: string;
      phone?: string;
    } = {};

    if (username && (username.length < 3 || username.length > 20)) {
      newErrors.username = "Username must be between 3 and 20 characters";
      isValid = false;
    }

    if (num && !/^\d{11}$/.test(num)) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
      isValid = false;
    }

    if (fullname && fullname.length < 2) {
      newErrors.fullname = "Full name must be at least 2 characters";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const validateAndUpdate = async () => {
    Keyboard.dismiss();
    if (!validateForm()) {
      setAlertMessage("Please fix the errors in the form");
      setAlertType("error");
      setTimeout(() => setAlertMessage(null), 3000);
      return;
    }

    if (username && username !== userData?.username) {
      setLoad(true);
      try {
        const q = query(collection(db, 'Users'), where('username'.toLowerCase(), '==', username.toLowerCase()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setAlertMessage("Username is already taken");
          setAlertType("error");
          setLoad(false);
          setTimeout(() => setAlertMessage(null), 3000);
          return;
        }
        Update();
      } catch (error) {
        console.error("Username validation error:", error);
        setAlertMessage("Error checking username availability");
        setAlertType("error");
        setLoad(false);
        setTimeout(() => setAlertMessage(null), 3000);
      }
    } else {
      Update();
    }
  };

  async function Update() {
    if (!load) setLoad(true);
    const currentUser = auth.currentUser;
    try {
      if (currentUser) {
        const docRef = doc(db, "Users", currentUser?.uid);

        if (image) {
          const imageUrl = await uploadImageToImgbb(image);
          await updateDoc(docRef, {
            image: imageUrl,
          });
        }

        const updates: any = {};
        if (username) updates.username = username;
        if (num) updates.phone = num;
        if (fullname) updates.fullname = fullname;

        if (Object.keys(updates).length > 0) {
          await updateDoc(docRef, updates);
        }

        setAlertMessage("Profile updated successfully!");
        setAlertType("success");
        setTimeout(() => {
          setLoad(false);
          router.replace("../../(tabs)/profile");
        }, 2000);
      } else {
        setAlertMessage("No user is currently logged in");
        setAlertType("error");
        setLoad(false);
        setTimeout(() => {
          router.replace("../Login");
        }, 3000);
      }
    } catch (error) {
      console.error("Update error:", error);
      setAlertMessage("Failed to update profile. Please try again.");
      setAlertType("error");
      setLoad(false);
    }
  }

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <>
          <Stack.Screen name="address" options={{ headerShown: false }} />
          {alertMessage && (
            <MiniAlert
              message={alertMessage}
              type={alertType}
              onHide={() => setAlertMessage(null)}
            />
          )}
          <LinearGradient
            colors={['#f9f9f9', '#f0e6dd', '#e8d0c0']}
            style={styles.gradientContainer}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => { router.back() }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="arrow-back-circle-outline" size={46} color="#5D4037" />
              </TouchableOpacity>

              <View style={{ alignItems: 'center', width: '100%' }}>
                <Text style={styles.title}>Edit Profile</Text>
                <View style={styles.underline} />

                <View style={styles.profileImageContainer}>
                  <TouchableOpacity
                    onPress={showImageOptions}
                    style={styles.imageWrapper}
                  >
                    <Image
                      source={image ? { uri: image } : { uri: userData?.image }}
                      style={styles.logo}
                    />
                    <View style={styles.editBadge}>
                      <Ionicons name="camera" size={20} color="white" />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.changePhotoText}>Tap to change profile photo</Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons name="account" size={24} color="#8B5E3C" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputbox}
                        placeholder={userData?.username ? userData.username : "Enter username"}
                        onChangeText={(text) => { setUsername(text); }}
                        placeholderTextColor="#8B8B8B"
                        autoCapitalize="none"
                      />
                    </View>
                    {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialIcons name="person" size={24} color="#8B5E3C" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputbox}
                        placeholder={userData?.fullname || "Enter full name"}
                        onChangeText={(text) => { setFullname(text); }}
                        placeholderTextColor="#8B8B8B"
                      />
                    </View>
                    {errors.fullname && <Text style={styles.errorText}>{errors.fullname}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialIcons name="phone" size={24} color="#8B5E3C" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputbox}
                        placeholder={userData?.phone || "Enter phone number"}
                        keyboardType="phone-pad"
                        onChangeText={(text) => { setNum(text); }}
                        placeholderTextColor="#8B8B8B"
                      />
                    </View>
                    {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                  </View>
                </View>
              </View>

              <SaveButton />
            </ScrollView>

            <Modal
              animationType="fade"
              transparent={true}
              visible={imageSourceModalVisible}
              onRequestClose={() => setImageSourceModalVisible(false)}
            >
              <TouchableWithoutFeedback onPress={() => setImageSourceModalVisible(false)}>
                <View style={styles.imageSourceModalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={styles.imageSourceModalContent}>
                      <Text style={styles.imageSourceModalTitle}>Change Profile Picture</Text>

                      <View style={styles.imageSourceOptions}>
                        <TouchableOpacity
                          style={styles.imageSourceOption}
                          onPress={pickImageFromGallery}
                        >
                          <LinearGradient
                            colors={['#8B5E3C', '#A87C5F']}
                            style={styles.optionIconContainer}
                          >
                            <FontAwesome name="photo" size={28} color="white" />
                          </LinearGradient>
                          <Text style={styles.imageSourceOptionText}>Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.imageSourceOption}
                          onPress={takePhotoWithCamera}
                        >
                          <LinearGradient
                            colors={['#5D4037', '#8B6B61']}
                            style={styles.optionIconContainer}
                          >
                            <FontAwesome name="camera" size={28} color="white" />
                          </LinearGradient>
                          <Text style={styles.imageSourceOptionText}>Camera</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.imageSourceCancelButton}
                        onPress={() => setImageSourceModalVisible(false)}
                      >
                        <Text style={styles.imageSourceCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </LinearGradient>
        </>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A3222',
    marginTop: 20,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  underline: {
    height: 4,
    backgroundColor: '#8B5E3C',
    width: 100,
    marginBottom: 30,
    borderRadius: 2,
  },
  profileImageContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: "#FFF",
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#8B5E3C',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  changePhotoText: {
    marginTop: 10,
    color: '#8B5E3C',
    fontSize: 14,
    fontStyle: 'italic',
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#5D4037',
    paddingLeft: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginLeft: 15,
    marginRight: 5,
  },
  inputbox: {
    flex: 1,
    height: 54,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 50,
    zIndex: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#8B5E3C',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    position: 'absolute',
    bottom: 30,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  iconContainer: {
    marginRight: 10,
  },
  imageSourceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSourceModalContent: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageSourceModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#4A3222',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  imageSourceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 25,
  },
  imageSourceOption: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    width: '40%',
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  imageSourceOptionText: {
    marginTop: 10,
    fontSize: 16,
    color: '#5D4037',
    fontWeight: '600',
  },
  imageSourceCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  imageSourceCancelText: {
    fontSize: 16,
    color: '#5D4037',
    fontWeight: 'bold',
  },
})

export default EditProfile;