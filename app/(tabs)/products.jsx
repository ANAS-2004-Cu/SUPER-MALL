import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, FlatList, Dimensions, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from "react-native-vector-icons/Feather";
const { width } = Dimensions.get('window');
const cardWidth = (width / 2) - 24;
import { db, auth } from '../../Firebase/Firebase';
import { collection, onSnapshot, setDoc, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import MiniAlert from '../../components/MiniAlert';

const ProductList = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const currentUser = auth.currentUser;
  const applyDiscount = (price, discountPercentage) => {
    return Math.floor(price - (price * discountPercentage) / 100);
  };
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [load, setLoad] = useState(false);
  const showAlert = (message, type = 'success') => {
    setLoad(true);
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLoad(false);
    }, 3000);
  };
  const filteredProducts = products.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  useEffect(() => {

    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        docId: doc.id, ...doc.data(),
      }));
      setProducts(usersData);
    });

    return () => unsubscribe();
  }, []);
  console.log("Data:", products);

  const handleAddToCart = async (item) => {
    if (!currentUser) {
      showAlert('Please sign in to add products to your shopping cart', 'error');
      setTimeout(() => {
        router.replace("/Login");
      }, 3000);
      return;
    }

    try {
      const cartDocRef = doc(db, 'Users', currentUser.uid, 'cart', item.docId);
      const cartDocSnap = await getDoc(cartDocRef);

      if (cartDocSnap.exists()) {
        await updateDoc(cartDocRef, {
          quantity: increment(1),
          updatedAt: new Date(),
        });
      } else {
        await setDoc(cartDocRef, {
          productId: item.docId,
          name: item.name,
          price: item.price,
          image: item.image,
          discount: item.discount || 0,
          quantity: 1,
          createdAt: new Date(),
        });
      }
      showAlert(`${String(item.name).split(' ').slice(0, 2).join(' ')} Added to your shopping cart`, 'success');

    } catch (error) {
      console.error("Error adding to cart:", error);
      showAlert('Failed to add product to cart. Please try again.', 'error');
    }
  };
  return (
    <View style={styles.container}>
      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
        />
      )}
      <Text style={styles.heading}>All Products</Text>
      <TextInput
        placeholder="Search products..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchInput}
      />
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.docId}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/singlepage", params: { id: item.docId } })} disabled={load}>
            <View style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={3}>{item.name}</Text>
                <Text style={styles.price}>EGP {applyDiscount(item.price, item.discount)}</Text>
                <TouchableOpacity
                  style={styles.addToCartButton}
                  onPress={() => handleAddToCart(item)}
                  disabled={load}
                >
                  <Icon name="shopping-cart" size={20} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 5 }}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#f5f5f5',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    margin: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    alignItems: 'center',
    height: 280,
  },
  image: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
    borderRadius: 10,
  },

  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#222',
  },
  price: {
    fontSize: 14,
    color: 'red',
    fontWeight: '600',
    marginTop: 5,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    width: "100%",
  },
});

export default ProductList;