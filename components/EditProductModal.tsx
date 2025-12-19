import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { updateProduct } from '../app/services/backend';
import MiniAlert from './Component/MiniAlert';

interface EditingProduct {
    id: string;
    name?: string;
    price?: string;
    description?: string;
    category?: string;
    image?: string;
    discount?: string;
}

interface EditProductModalProps {
    visible: boolean;
    onClose: () => void;
    editingProduct: EditingProduct | null;
    setEditingProduct: (product: EditingProduct | null) => void;
    onRefresh: () => void;
}

const EditProductModal = ({
    visible,
    onClose,
    editingProduct,
    setEditingProduct,
    onRefresh,
}: EditProductModalProps) => {
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'error' | null>('success');
    const [loadingb, setLoadingb] = useState<boolean>(false);
    const [uploadingImage, setUploadingImage] = useState<boolean>(false);
    const [imageSourceModalVisible, setImageSourceModalVisible] = useState<boolean>(false);

    const categories = ['Mobile', 'Computers', 'TVs', "Men", "Women", 'Kids'];

    const handleUpdate = async () => {
        if (!editingProduct || !editingProduct.name || !editingProduct.price || !editingProduct.description) {
            setAlertMsg("Please enter all product details");
            setAlertType("error");
            return;
        }

        setLoadingb(true);
        try {
            // TODO replaced firebase call: "await updateDoc(doc(db, 'products', editingProduct.id), { ... });"
            const response = await updateProduct(editingProduct.id, {
                name: editingProduct.name,
                price: parseFloat(editingProduct.price),
                description: editingProduct.description,
                category: editingProduct.category,
                image: editingProduct.image,
                discount: parseFloat(editingProduct.discount || '0'),
            });
            if (!response.success) {
                throw new Error(response.error || 'Failed to update product');
            }
            setAlertMsg("Product updated successfully");
            setAlertType("success");
            setTimeout(() => {
                onClose();
                onRefresh();
            }, 3000);
        } catch (error) {
            console.error('Error updating product:', error);
            setAlertMsg("Failed to update product");
            setAlertType("error");
        } finally {
            setLoadingb(false);
        }
    };

    const pickImageFromGallery = async () => {
        setImageSourceModalVisible(false);
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            await uploadImage(result.assets[0].uri);
        }
    };

    const takePhotoWithCamera = async () => {
        setImageSourceModalVisible(false);

        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (!permissionResult.granted) {
            setAlertMsg('You need to allow camera access to take photos.');
            setAlertType('error');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            await uploadImage(result.assets[0].uri);
        }
    };

    const pickImage = () => {
        setImageSourceModalVisible(true);
    };

    const uploadImage = async (uri: string) => {
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('image', {
                uri,
                type: 'image/jpeg',
                name: 'product.jpg',
            } as any);

            const response = await fetch(
                'https://api.imgbb.com/1/upload?key=5f368fdc294d3cd3ddc0b0e9297a10fb',
                {
                    method: 'POST',
                    body: formData,
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            );

            const data = await response.json();
            if (data.success) {
                setEditingProduct({ ...editingProduct!, image: data.data.url });
            } else {
                throw new Error('Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            setAlertMsg("Failed to upload image");
            setAlertType("error");
        } finally {
            setUploadingImage(false);
        }
    };

    return (
        <>
            <Modal
                animationType="slide"
                transparent={false}
                visible={visible}
                onRequestClose={onClose}
            >
                <LinearGradient colors={['#D1F4FF', '#f5ffff']} style={styles.editModalContainer}>
                    {alertMsg && (
                        <MiniAlert
                            message={alertMsg}
                            type={alertType || 'success'}
                            onHide={() => setAlertMsg(null)}
                        />
                    )}
                    <View style={styles.editModalHeader}>
                        <Text style={styles.editModalTitle}>Edit Product</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#2d3436" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.editModalContent}>
                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {editingProduct?.image ? (
                                <Image source={{ uri: editingProduct.image }} style={styles.imagePreview} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <MaterialIcons name="add-photo-alternate" size={40} color="#4a90e2" />
                                    <Text style={styles.imageText}>Change Product Image</Text>
                                </View>
                            )}
                            {uploadingImage && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Product Name</Text>
                            <TextInput
                                style={[styles.input, { textAlignVertical: 'top' }]}
                                value={editingProduct?.name || ''}
                                onChangeText={(text) => setEditingProduct(editingProduct ? { ...editingProduct, name: text } : null)}
                                placeholder="Product Name"
                                multiline={true}
                                blurOnSubmit={true}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Price</Text>
                            <TextInput
                                style={styles.input}
                                value={editingProduct?.price?.toString() || ''}
                                onChangeText={(text) => setEditingProduct(editingProduct ? { ...editingProduct, price: text } : null)}
                                placeholder="Price"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Discount (%)</Text>
                            <TextInput
                                style={styles.input}
                                value={editingProduct?.discount?.toString() || ''}
                                onChangeText={(text) => setEditingProduct(editingProduct ? { ...editingProduct, discount: text } : null)}
                                placeholder="Discount percentage (0-100)"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.multilineInput]}
                                value={editingProduct?.description || ''}
                                onChangeText={(text) => setEditingProduct(editingProduct ? { ...editingProduct, description: text } : null)}
                                placeholder="Description"
                                multiline
                                numberOfLines={4}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={editingProduct?.category || ''}
                                    onValueChange={(itemValue) => setEditingProduct(editingProduct ? { ...editingProduct, category: itemValue } : null)}
                                    style={{ color: '#000' }}
                                >
                                    <Picker.Item label="Select a category" value="" />
                                    {categories.map((category, index) => (
                                        <Picker.Item key={index} label={category} value={category} />
                                    ))}
                                    <Picker.Item label="Other" value="Other" />
                                </Picker>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.updateProductButton}
                            onPress={handleUpdate}
                            disabled={loadingb || uploadingImage}
                        >
                            {loadingb ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.updateProductButtonText}>Update Product</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </LinearGradient>
            </Modal>

            <Modal
                animationType="fade"
                transparent={true}
                visible={imageSourceModalVisible}
                onRequestClose={() => setImageSourceModalVisible(false)}
            >
                <View style={styles.imageSourceModalOverlay}>
                    <View style={styles.imageSourceModalContent}>
                        <Text style={styles.imageSourceModalTitle}>Select Image Source</Text>

                        <View style={styles.imageSourceOptions}>
                            <TouchableOpacity
                                style={styles.imageSourceOption}
                                onPress={pickImageFromGallery}
                            >
                                <FontAwesome name="photo" size={40} color="#4a90e2" />
                                <Text style={styles.imageSourceOptionText}>From Gallery</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.imageSourceOption}
                                onPress={takePhotoWithCamera}
                            >
                                <FontAwesome name="camera" size={40} color="#4a90e2" />
                                <Text style={styles.imageSourceOptionText}>By Camera</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.imageSourceCancelButton}
                            onPress={() => setImageSourceModalVisible(false)}
                        >
                            <Text style={styles.imageSourceCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    editModalContainer: {
        flex: 1,
        paddingTop: 15,
    },
    editModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    editModalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2d3436',
    },
    editModalContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    imagePicker: {
        width: '100%',
        height: 200,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    imagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageText: {
        marginTop: 10,
        color: '#4a90e2',
        fontSize: 16,
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    uploadingOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputContainer: {
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d3436',
        marginBottom: 5,
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        padding: 15,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    multilineInput: {
        height: 150,
        textAlignVertical: 'top',
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        backgroundColor: '#f8f9fa',
        marginTop: 5,
        justifyContent: 'center',
    },
    updateProductButton: {
        backgroundColor: '#4a90e2',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    updateProductButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    imageSourceModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageSourceModalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    imageSourceModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2d3436',
    },
    imageSourceOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    imageSourceOption: {
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#f8f9fa',
        width: '45%',
    },
    imageSourceOptionText: {
        marginTop: 10,
        fontSize: 16,
        color: '#333',
    },
    imageSourceCancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 30,
        backgroundColor: '#f1f2f6',
        borderRadius: 8,
    },
    imageSourceCancelText: {
        fontSize: 16,
        color: '#555',
        fontWeight: 'bold',
    },
});

export default EditProductModal;