import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Pressable, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useCart } from './CartContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import ModernAlert from '../../components/ModernAlert';
const { width } = Dimensions.get("window");

const Item = ({ item }) => {
  const [pressed, setPressed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const { addToCart } = useCart();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'info',
    primaryButtonText: 'OK',
    secondaryButtonText: '',
    onPrimaryPress: () => { },
    onSecondaryPress: () => { }
  });

  const showAlert = (config) => {
    setAlertConfig(config);
    setAlertVisible(true);
  };

  if (!item || !item.image || !item.price || !item.name) {
    return null;
  }

  const handleAddToCart = () => {
    try {
      addToCart(item);
      setModalVisible(false);

      showAlert({
        title: 'Added Successfully',
        message: `Added ${item.name} to your cart`,
        type: 'cart',
        primaryButtonText: 'Continue Shopping',
        secondaryButtonText: 'Go to Cart',
        onSecondaryPress: () => router.push("/cart"),
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to add product to cart. Please try again.',
        type: 'error',
        primaryButtonText: 'OK',
      });
    }
  };

  const handleProductPress = () => {
    router.push({
      pathname: "/singlepage",
      params: {
        id: item.docId,
        category: item.category
      }
    });
  };

  const handleFavoritePress = () => {
    try {
      setPressed(!pressed);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  return (
    <View>
      <Modal
        animationType='slide'
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(!modalVisible)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Do you want to add to your cart?</Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.button, styles.buttonAdd]}
                onPress={handleAddToCart}
              >
                <Text style={styles.textStyle}>Add to cart</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setModalVisible(!modalVisible)}
              >
                <Text style={styles.textStyle}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Pressable
        style={styles.item}
        onPress={handleProductPress}
        onLongPress={() => setModalVisible(true)}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <ActivityIndicator
              style={StyleSheet.absoluteFill}
              size="large"
              color="#0000ff"
            />
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>
            {item.price} EGP
          </Text>
          {item.discount && (
            <Text style={styles.discountPrice}>
              {item.price - (item.price * item.discount / 100)} EGP
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <FontAwesome
            style={[styles.heart, { color: pressed ? '#ff0000' : '#000000' }]}
            name={pressed ? 'heart' : 'heart-o'}
            size={20}
          />
        </TouchableOpacity>
      </Pressable>

      <ModernAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        primaryButtonText={alertConfig.primaryButtonText}
        secondaryButtonText={alertConfig.secondaryButtonText}
        onPrimaryPress={alertConfig.onPrimaryPress}
        onSecondaryPress={alertConfig.onSecondaryPress}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    marginHorizontal: 5,
    marginVertical: 10,
    backgroundColor: '#ffffff',
    width: width * 0.45,
    borderRadius: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    position: 'relative'
  },
  imageContainer: {
    width: '100%',
    height: 150,
    position: 'relative'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  productInfo: {
    padding: 10
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000'
  },
  discountPrice: {
    fontSize: 14,
    color: '#ff0000',
    textDecorationLine: 'line-through'
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1
  },
  heart: {
    fontSize: 16,
    backgroundColor: 'rgba(211, 211, 211, 0.7)',
    borderRadius: 50,
    padding: 8,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonAdd: {
    backgroundColor: '#4CAF50'
  },
  buttonCancel: {
    backgroundColor: '#f44336'
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold'
  }
});

export default Item;