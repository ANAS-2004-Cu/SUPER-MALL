import { FontAwesome, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { auth, createQuery, getCollection, getUserData, updateDocument } from '../../Firebase/Firebase';
import MiniAlert from '../../components/MiniAlert';

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
  const [imageSourceModalVisible, setImageSourceModalVisible] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ username?: string; fullname?: string; phone?: string; }>({});

  const IMGBB_API_KEY = "5f368fdc294d3cd3ddc0b0e9297a10fb";

  const showAlert = (message: string, type: 'success' | 'error', duration = 3000) => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => setAlertMessage(null), duration);
  };

  const pickImage = async (fromCamera = false) => {
    setImageSourceModalVisible(false);
    
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return showAlert("Camera permission required", "error");
    }

    const result = fromCamera 
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 4],
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 4],
          quality: 1,
        });

    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (username && (username.length < 3 || username.length > 20)) {
      newErrors.username = "Username must be between 3 and 20 characters";
    }
    if (num && !/^\d{11}$/.test(num)) {
      newErrors.phone = "Please enter a valid 11-digit phone number";
    }
    if (fullname && fullname.length < 2) {
      newErrors.fullname = "Full name must be at least 2 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAndUpdate = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return showAlert("Please fix the errors in the form", "error");

    setLoad(true);
    
    try {
      // Check username availability
      if (username && username !== userData?.username) {
        const usernameQuery = createQuery('username', '==', username);
        const existingUsers = await getCollection('Users', [usernameQuery]);
        
        if (existingUsers.success && existingUsers.data && existingUsers.data.length > 0) {
          setLoad(false);
          return showAlert("Username is already taken", "error");
        }
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoad(false);
        showAlert("No user logged in", "error");
        return router.replace("../Login");
      }

      const updates: any = {};
      
      // Upload image if changed
      if (image) {
        const formData = new FormData();
        formData.append("image", { uri: image, type: "image/jpeg", name: "profile.jpg" } as any);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: "POST",
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        const data = await response.json();
        updates.image = data.data.url;
      }

      // Add other updates
      if (username) updates.username = username;
      if (num) updates.phone = num;
      if (fullname) updates.fullname = fullname;

      // Update document
      if (Object.keys(updates).length > 0) {
        const updateResult = await updateDocument("Users", currentUser.uid, updates);
        if (!updateResult.success) throw new Error(updateResult.error);
      }

      // Update AsyncStorage
      const updatedUserData = await getUserData(currentUser.uid);
      if (updatedUserData) {
        await AsyncStorage.setItem('UserObject', JSON.stringify(updatedUserData));
      }

      showAlert("Profile updated successfully!", "success", 2000);
      setTimeout(() => {
        setLoad(false);
        router.replace("../../(tabs)/profile");
      }, 2000);

    } catch (error) {
      console.error("Update error:", error);
      showAlert("Failed to update profile. Please try again.", "error");
      setLoad(false);
    }
  };

  const SaveButton = () => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const animateButton = (toValue: number) => {
      Animated.spring(scaleAnim, {
        toValue,
        friction: 4,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableWithoutFeedback
        onPressIn={() => animateButton(0.95)}
        onPressOut={() => animateButton(1)}
        onPress={validateAndUpdate}
        disabled={load}
      >
        <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
          {load ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
          ) : (
            <View style={styles.iconContainer}>
              <MaterialIcons name="save" size={24} color="#fff" />
            </View>
          )}
          <Text style={styles.buttonText}>{load ? "Saving..." : "Save Changes"}</Text>
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

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
        <Stack.Screen name="address" options={{ headerShown: false }} />
        {alertMessage && (
          <MiniAlert
            message={alertMessage}
            type={alertType}
            onHide={() => setAlertMessage(null)}
          />
        )}
        <LinearGradient colors={['#f9f9f9', '#f0e6dd', '#e8d0c0']} style={styles.gradientContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="arrow-back-circle-outline" size={46} color="#5D4037" />
              </TouchableOpacity>

              <View style={{ alignItems: 'center', width: '100%' }}>
                <Text style={styles.title}>Edit Profile</Text>
                <View style={styles.underline} />

                <View style={styles.profileImageContainer}>
                  <TouchableOpacity onPress={() => setImageSourceModalVisible(true)} style={styles.imageWrapper}>
                    <Image source={{ uri: image || userData?.image }} style={styles.logo} />
                    <View style={styles.editBadge}>
                      <Ionicons name="camera" size={20} color="white" />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.changePhotoText}>Tap to change profile photo</Text>
                </View>

                <View style={styles.formContainer}>
                  {[
                    { label: "Username", value: username, setter: setUsername, placeholder: userData?.username, icon: "account", error: errors.username },
                    { label: "Full Name", value: fullname, setter: setFullname, placeholder: userData?.fullname, icon: "person", error: errors.fullname },
                    { label: "Phone Number", value: num, setter: setNum, placeholder: userData?.phone, icon: "phone", error: errors.phone, keyboardType: "phone-pad" }
                  ].map((field, index) => (
                    <View key={index} style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>{field.label}</Text>
                      <View style={styles.inputWrapper}>
                        {field.icon === "account" ? (
                          <MaterialCommunityIcons name="account" size={24} color="#8B5E3C" style={styles.inputIcon} />
                        ) : (
                          <MaterialIcons name={field.icon as any} size={24} color="#8B5E3C" style={styles.inputIcon} />
                        )}
                        <TextInput
                          style={styles.inputbox}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          onChangeText={field.setter}
                          placeholderTextColor="#8B8B8B"
                          autoCapitalize={field.label === "Username" ? "none" : "words"}
                          keyboardType={field.keyboardType as any}
                        />
                      </View>
                      {field.error && <Text style={styles.errorText}>{field.error}</Text>}
                    </View>
                  ))}
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
                        {[
                          { title: "Gallery", icon: "photo", onPress: () => pickImage(false), colors: ['#8B5E3C', '#A87C5F'] as const },
                          { title: "Camera", icon: "camera", onPress: () => pickImage(true), colors: ['#5D4037', '#8B6B61'] as const }
                        ].map((option, index) => (
                          <TouchableOpacity key={index} style={styles.imageSourceOption} onPress={option.onPress}>
                            <LinearGradient colors={option.colors} style={styles.optionIconContainer}>
                              <FontAwesome name={option.icon as any} size={28} color="white" />
                            </LinearGradient>
                            <Text style={styles.imageSourceOptionText}>{option.title}</Text>
                          </TouchableOpacity>
                        ))}
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
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
    </TouchableWithoutFeedback>
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