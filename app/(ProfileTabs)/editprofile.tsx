import { FontAwesome, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { auth, createQuery, getCollection, getUserData, updateDocument } from '../../Firebase/Firebase';
import { darkTheme, lightTheme } from '../../Theme/ProfileTabs/EditProfileTheme';
import MiniAlert from '../../components/Component/MiniAlert';

const { width } = Dimensions.get('window');
const IMGBB_API_KEY = "5f368fdc294d3cd3ddc0b0e9297a10fb";

const EditProfile = () => {
  const [image, setImage] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [fullname, setFullname] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [num, setNum] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState<boolean>(false);
  const [imageModalVisible, setImageModalVisible] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ username?: string; fullname?: string; phone?: string; }>({});
  const [theme, setTheme] = useState(lightTheme);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadTheme();
    fetchUserData();
  }, []);

  const loadTheme = async () => {
    try {
      const themeMode = await AsyncStorage.getItem('ThemeMode');
      setTheme(themeMode === '2' ? darkTheme : lightTheme);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const fetchUserData = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const data = await getUserData(currentUser.uid);
      setUserData(data);
    }
  };

  const showAlert = (message: string, type: 'success' | 'error', duration = 3000) => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => setAlertMessage(null), duration);
  };

  const requestCameraPermission = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert("Camera permission required", "error");
      return false;
    }
    return true;
  };

  const launchImagePicker = async (fromCamera: boolean) => {
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4] as [number, number],
      quality: 1,
    };

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const pickImage = async (fromCamera = false) => {
    setImageModalVisible(false);

    if (fromCamera && !(await requestCameraPermission())) return;

    await launchImagePicker(fromCamera);
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

  const checkUsernameAvailability = async (newUsername: string) => {
    if (newUsername === userData?.username) return true;

    const usernameQuery = createQuery('username', '==', newUsername);
    const existingUsers = await getCollection('Users', [usernameQuery]);

    return !(existingUsers.success && existingUsers.data && existingUsers.data.length > 0);
  };

  const uploadImage = async (imageUri: string) => {
    const formData = new FormData();
    formData.append("image", { uri: imageUri, type: "image/jpeg", name: "profile.jpg" } as any);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const data = await response.json();
    return data.data.url;
  };

  const prepareUpdates = async () => {
    const updates: any = {};

    if (image) {
      updates.image = await uploadImage(image);
    }

    if (username) updates.username = username;
    if (num) updates.phone = num;
    if (fullname) updates.fullname = fullname;

    return updates;
  };

  const updateUserProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showAlert("No user logged in", "error");
      router.replace("../Login");
      return;
    }

    const updates = await prepareUpdates();

    if (Object.keys(updates).length > 0) {
      const updateResult = await updateDocument("Users", currentUser.uid, updates);
      if (!updateResult.success) throw new Error(updateResult.error);
    }

    const updatedUserData = await getUserData(currentUser.uid);
    if (updatedUserData) {
      await AsyncStorage.setItem('UserObject', JSON.stringify(updatedUserData));
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();

    if (!validateForm()) {
      showAlert("Please fix the errors in the form", "error");
      return;
    }

    setLoading(true);

    try {
      if (username && !(await checkUsernameAvailability(username))) {
        showAlert("Username is already taken", "error");
        return;
      }

      await updateUserProfile();

      showAlert("Profile updated successfully!", "success", 2000);
      setTimeout(() => {
        router.replace("../../(tabs)/profile");
      }, 2000);

    } catch (error) {
      console.error("Update error:", error);
      showAlert("Failed to update profile. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const animateButton = (toValue: number) => {
    Animated.spring(scaleAnim, {
      toValue,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const renderInputField = (label: string, value: string | null, setter: (value: string) => void, placeholder: string, icon: string, error?: string, keyboardType?: string) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: theme.inputLabelColor }]}>
        {label}
      </Text>
      <View style={[styles.inputWrapper, {
        borderColor: theme.inputBorderColor,
        backgroundColor: theme.inputBackgroundColor
      }]}>
        {icon === "account" ? (
          <MaterialCommunityIcons
            name="account"
            size={24}
            color={theme.inputIconColor}
            style={styles.inputIcon}
          />
        ) : (
          <MaterialIcons
            name={icon as any}
            size={24}
            color={theme.inputIconColor}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[styles.inputbox, { color: theme.inputTextColor }]}
          placeholder={placeholder}
          onChangeText={setter}
          placeholderTextColor={theme.placeholderColor}
          autoCapitalize={label === "Username" ? "none" : "words"}
          keyboardType={keyboardType as any}
        />
      </View>
      {error && (
        <Text style={[styles.errorText, { color: theme.errorTextColor }]}>
          {error}
        </Text>
      )}
    </View>
  );

  const renderImageOption = (title: string, icon: string, onPress: () => void, colors: string[]) => (
    <TouchableOpacity style={styles.imageSourceOption} onPress={onPress}>
      <LinearGradient colors={colors as [string, string, ...string[]]} style={styles.optionIconContainer}>
        <FontAwesome name={icon as any} size={28} color="white" />
      </LinearGradient>
      <Text style={[styles.imageSourceOptionText, { color: theme.optionTextColor }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

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

        <LinearGradient colors={theme.gradientColors as [string, string, ...string[]]} style={styles.gradientContainer}>
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
                <Ionicons name="arrow-back-circle-outline" size={46} color={theme.backButtonColor} />
              </TouchableOpacity>

              <View style={{ alignItems: 'center', width: '100%' }}>
                <Text style={[styles.title, { color: theme.titleColor }]}>Edit Profile</Text>
                <View style={[styles.underline, { backgroundColor: theme.underlineColor }]} />

                <View style={styles.profileImageContainer}>
                  <TouchableOpacity onPress={() => setImageModalVisible(true)} style={styles.imageWrapper}>
                    <Image source={{ uri: image || userData?.image }} style={styles.logo} />
                    <View style={[styles.editBadge, { backgroundColor: theme.editBadgeColor }]}>
                      <Ionicons name="camera" size={20} color="white" />
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.changePhotoText, { color: theme.changePhotoTextColor }]}>
                    Tap to change profile photo
                  </Text>
                </View>

                <View style={styles.formContainer}>
                  {renderInputField("Username", username, setUsername, userData?.username, "account", errors.username)}
                  {renderInputField("Full Name", fullname, setFullname, userData?.fullname, "person", errors.fullname)}
                  {renderInputField("Phone Number", num, setNum, userData?.phone, "phone", errors.phone, "phone-pad")}
                </View>
              </View>

              <TouchableWithoutFeedback
                onPressIn={() => animateButton(0.95)}
                onPressOut={() => animateButton(1)}
                onPress={handleSave}
                disabled={loading}
              >
                <Animated.View style={[styles.button, {
                  backgroundColor: theme.buttonColor,
                  transform: [{ scale: scaleAnim }]
                }]}>
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
                  ) : (
                    <View style={styles.iconContainer}>
                      <MaterialIcons name="save" size={24} color={theme.buttonTextColor} />
                    </View>
                  )}
                  <Text style={[styles.buttonText, { color: theme.buttonTextColor }]}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Text>
                </Animated.View>
              </TouchableWithoutFeedback>
            </ScrollView>

            <Modal
              animationType="fade"
              transparent={true}
              visible={imageModalVisible}
              onRequestClose={() => setImageModalVisible(false)}
            >
              <TouchableWithoutFeedback onPress={() => setImageModalVisible(false)}>
                <View style={[styles.imageSourceModalOverlay, {
                  backgroundColor: theme.modalOverlayColor
                }]}>
                  <TouchableWithoutFeedback>
                    <View style={[styles.imageSourceModalContent, {
                      backgroundColor: theme.modalBackgroundColor
                    }]}>
                      <Text style={[styles.imageSourceModalTitle, { color: theme.modalTitleColor }]}>
                        Change Profile Picture
                      </Text>

                      <View style={styles.imageSourceOptions}>
                        {renderImageOption("Gallery", "photo", () => pickImage(false), theme.optionGradient1)}
                        {renderImageOption("Camera", "camera", () => pickImage(true), theme.optionGradient2)}
                      </View>

                      <TouchableOpacity
                        style={[styles.imageSourceCancelButton, {
                          backgroundColor: theme.cancelButtonBackgroundColor,
                          borderColor: theme.cancelButtonBorderColor
                        }]}
                        onPress={() => setImageModalVisible(false)}
                      >
                        <Text style={[styles.imageSourceCancelText, { color: theme.cancelTextColor }]}>
                          Cancel
                        </Text>
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
  );
};

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
    marginTop: 20,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
  underline: {
    height: 4,
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
    paddingLeft: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
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
  },
  errorText: {
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
    fontWeight: 'bold',
    fontSize: 18,
  },
  iconContainer: {
    marginRight: 10,
  },
  imageSourceModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSourceModalContent: {
    width: width * 0.85,
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
    fontWeight: '600',
  },
  imageSourceCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    borderWidth: 1,
  },
  imageSourceCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfile;