import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, ToastAndroid, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../Firebase/Firebase';
import { FontAwesome } from '@expo/vector-icons';
import MiniAlert from '../../components/Component/MiniAlert';


const AddProduct = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const currentUser = auth.currentUser;
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [productDetails, setProductDetails] = useState({
    name: '',
    image: '',
    category: '',
    description: '',
    price: 0,
    discount: 0,
    createdAt: new Date(),
    AddedBy: currentUser.email,
  });

  const uploadImageToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    });
    formData.append('upload_preset', 'photos');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dtxvpdxsb/image/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setImage(data.secure_url);
      setProductDetails({ ...productDetails, image: data.secure_url });
    } catch (error) {
      console.log('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImageFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setLoading(true);
      const uri = result.assets[0].uri;
      await uploadImageToCloudinary(uri);
    }
  };

  const takePhotoWithCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      setAlertMessage('You need to allow camera access to take photos.');
      setAlertType('error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setLoading(true);
      const uri = result.assets[0].uri;
      await uploadImageToCloudinary(uri);
    }
  };

  const changeHandler = (name, value) => {
    setProductDetails({ ...productDetails, [name]: value });
  };

  const addButton = async () => {
    if (!productDetails.image) {
      setAlertMessage("Please upload an image before submitting.");
      setAlertType('error');
      return;
    }
    console.log('Product Details:', productDetails);
    if (!productDetails.name || !productDetails.category || !productDetails.description || !productDetails.price || !productDetails.discount) {
      setAlertMessage("Please fill in all fields.");
      setAlertType('error');
      return;
    }

    setLoading(true);
    try {
      const newProduct = {
        ...productDetails,
        price: Number(productDetails.price),
        discount: Number(productDetails.discount),
      };
      await addDoc(collection(db, 'products'), newProduct);

      ToastAndroid.showWithGravityAndOffset(
        'Product added successfully',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
        0,
        100
      );

      setProductDetails({
        name: '',
        image: '',
        category: '',
        description: '',
        price: 0,
        createdAt: new Date(),
        discount: 0,
        AddedBy: currentUser.email,
      });
      setImage(null);
    } catch (error) {
      setAlertMessage('Failed to add product');
      setAlertType('error');
      console.error('Error adding product: ', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView>
        <View style={styles.container}>
          {alertMessage && (
            <MiniAlert
              message={alertMessage}
              type={alertType}
              onHide={() => setAlertMessage(null)}
            />
          )}

          <Text style={styles.header}>Add Product</Text>

          <Text style={styles.label}>Product Title</Text>
          <TextInput
            style={styles.input}
            value={productDetails.name}
            onChangeText={(text) => changeHandler('name', text)}
            placeholder="Enter here"
          />

          <Text style={styles.label}>Product Category</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={productDetails.category}
              onValueChange={(itemValue) => changeHandler('category', itemValue)}
              style={{ color: '#000' }}
            >
              <Picker.Item label="Select a category" value="" />
              <Picker.Item label="Mobile" value="Mobile" />
              <Picker.Item label="Computers" value="Computers" />
              <Picker.Item label="TVs" value="TVs" />
              <Picker.Item label="Men" value="Men" />
              <Picker.Item label="Women" value="Women" />
              <Picker.Item label="Kids" value="Kids" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          <Text style={styles.label}>Product Description</Text>
          <TextInput
            style={styles.input}
            value={productDetails.description}
            onChangeText={(text) => changeHandler('description', text)}
            placeholder="Enter here"
          />

          <Text style={styles.label}>Product Price</Text>
          <TextInput
            style={styles.input}
            value={productDetails.price}
            onChangeText={(text) => changeHandler('price', text)}
            keyboardType="numeric"
            placeholder="Enter here"
          />
          <Text style={styles.label}>Product Discount</Text>
          <TextInput
            style={styles.input}
            value={productDetails.discount}
            onChangeText={(text) => changeHandler('discount', text)}
            keyboardType="numeric"
            placeholder="Enter here"
          />

          {image ? (
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <View>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setImage(null);
                    setProductDetails({ ...productDetails, image: '' });
                  }}
                >
                  <FontAwesome name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageButtonsContainer}>
              <TouchableOpacity onPress={pickImageFromLibrary} style={styles.imagePicker}>
                <FontAwesome name="photo" size={30} color="#aaa" />
                <Text style={styles.optionText}>From Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={takePhotoWithCamera} style={styles.imagePicker}>
                <FontAwesome name="camera" size={30} color="#aaa" />
                <Text style={styles.optionText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={addButton} style={styles.button} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.buttonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingBottom: 50,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 30,
    padding: 10,
    marginTop: 5,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  imagePicker: {
    alignItems: 'center',
  },
  optionText: {
    marginTop: 5,
    color: '#555',
    fontSize: 14,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 15,
  },
  button: {
    borderWidth: 1,
    borderColor: '#add8e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 20,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 30,
    marginTop: 5,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    padding: 5,
    zIndex: 1,
  },
});

export default AddProduct;