import Icon from "react-native-vector-icons/Feather";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, Image, StyleSheet, FlatList, Dimensions, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
const { width } = Dimensions.get("window");
const cardWidth = width / 2 - 24;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../Firebase/Firebase';
import { collection, onSnapshot, arrayUnion, arrayRemove, query, orderBy, limit } from "firebase/firestore";
import { MaterialIcons } from '@expo/vector-icons';
import { auth } from "../../Firebase/Firebase";
import { doc, getDoc, setDoc, updateDoc, increment, getDocs } from 'firebase/firestore';

import MiniAlert from '../../components/MiniAlert';

const HomePage = () => {
  const { categories } = useLocalSearchParams();
  const selectedCategories = categories ? JSON.parse(categories) : [];
  const [storedCategories, setStoredCategories] = useState([]);

  console.log(selectedCategories);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const currentUser = auth.currentUser;
  const router = useRouter();

  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');

  const [filteredItems, setFilteredItems] = useState([]);
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

  const storeCategories = async () => {
    try {
      if (selectedCategories.length > 0) {

        const existing = await AsyncStorage.getItem('categories');
        if (!existing) {
          await AsyncStorage.setItem('categories', JSON.stringify(selectedCategories));
          console.log('Categories saved to AsyncStorage');
        } else {
          console.log('Categories already exist in AsyncStorage');
        }
      }
    } catch (error) {
      console.log('Error storing categories:', error);
    }
  };

  const getStoredCategories = async () => {
    try {
      const value = await AsyncStorage.getItem('categories');
      if (value) {
        const parsed = JSON.parse(value);
        setStoredCategories(parsed);
        console.log('Fetched categories from AsyncStorage:', parsed);


        fetchAndFilterProducts(parsed);
      } else {
        console.log('No categories found in AsyncStorage');
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
    }
  };
  const fetchAndFilterProducts = async (categoriesToUse) => {
    const querySnapshot = await getDocs(collection(db, "products"));
    const allItems = [];
    querySnapshot.forEach((doc) => {
      allItems.push({ docId: doc.id, ...doc.data() });
    });

    console.log("this is in Async", categoriesToUse);
    const filtered = allItems.filter(item =>
      categoriesToUse.includes(item.category)
    );

    setFilteredItems(filtered);
  };


  useEffect(() => {
    const init = async () => {
      await storeCategories();
      await getStoredCategories();
    };
    init();
  }, []);




  const handleLogout = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('DataForUser');
      await AsyncStorage.removeItem('categories');
      console.log('Categories removed from AsyncStorage');
      await showAlert('Bye Bye 👋 \nWe will miss you 🤍', 'error');
      setTimeout(() => {
        router.replace("/Login");
      }, 3000);
    } catch (error) {
      showAlert('Error', 'Logout failed. Please try again.', 'error');
      console.error(error);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(20));

      const unsubscribeListener = onSnapshot(productsQuery, (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({
          docId: doc.id,
          ...doc.data(),
        }));
        setProducts(productsData);
        setLoading(false);
        setRefreshing(false);
      }, (err) => {
        console.error("Error fetching products:", err);
        setError("Unable to load products. Please try again later.");
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribeListener;
    } catch (err) {
      console.error("Error setting up products listener:", err);
      setError("Something went wrong. Please try again later.");
      setLoading(false);
      setRefreshing(false);

      return () => { };
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, "Users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().Fav) {
        setFavorites(userDoc.data().Fav || []);

      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    let unsubscribe;

    const start = async () => {
      unsubscribe = await fetchProducts();
      fetchFavorites();
    };

    start();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchProducts, fetchFavorites]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
    fetchFavorites();
    fetchAndFilterProducts()
  }, [fetchProducts, fetchFavorites, fetchAndFilterProducts]);

  const applyDiscount = (price, discountPercentage) => {
    return Math.floor(price - (price * discountPercentage) / 100);
  };

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

  const isItemFavorite = useCallback((itemId) => {
    if (!currentUser || !favorites || favorites.length === 0) return false;
    return favorites.includes(itemId);
  }, [favorites, currentUser]);

  const handleFavorite = async (item) => {
    if (!currentUser) {
      showAlert('Please log in to add items to your favorites.', 'error');
      setTimeout(() => {
        router.replace("/Login");
      }, 2000);
      return;
    }

    try {
      const userDocRef = doc(db, "Users", currentUser.uid);
      const isFavorite = isItemFavorite(item.docId);

      if (isFavorite) {
        await updateDoc(userDocRef, {
          Fav: arrayRemove(item.docId),
        });
        setFavorites(prev => prev.filter(id => id !== item.docId));
        showAlert(`${String(item.name).split(' ').slice(0, 2).join(' ')} Removed from your favorites!`, 'error');
      } else {
        await updateDoc(userDocRef, {
          Fav: arrayUnion(item.docId),
        });
        setFavorites(prev => [...prev, item.docId]);
        showAlert(`${String(item.name).split(' ').slice(0, 2).join(' ')} Added to your favorites!`, 'success');
      }

    } catch (error) {
      console.error("Error updating favorites:", error);
      showAlert('Failed to update favorites. Please try again.', 'error');
    }
  };

  const Item = ({ item }) => {
    const isFavorite = isItemFavorite(item.docId);

    return (
      <TouchableOpacity onPress={() => router.push({ pathname: "/singlepage", params: { id: item.docId } })} disabled={load}>
        <View style={styles.card}>
          <View style={{ position: 'relative', width: '100%', height: 120 }}>
            <Image
              source={{ uri: item.image }}
              style={styles.image}
              resizeMethod="resize"
              resizeMode="contain"
              defaultSource={require('../../assets/images/loading-buffering.gif')}
            />
            {item.discount > 0 && (
              <View style={styles.discountContainer}>
                <Icon name="tag" size={14} color="#fff" />
                <Text style={styles.discountText}>{item.discount}% OFF</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => handleFavorite(item)}
              disabled={load}
            >
              <Icon name="heart" size={20} color={isFavorite ? "#E91E63" : "#fff"} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title} numberOfLines={2}>{item.name}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.oldPrice}>{formatNumber(item.price)} EGP</Text>
            <Text style={styles.newPrice}>{formatNumber(applyDiscount(item.price, item.discount))} EGP</Text>
          </View>

          <TouchableOpacity
            style={styles.addToCartButton}
            onPress={() => handleAddToCart(item)}
            disabled={load}
          >
            <Icon name="shopping-cart" size={20} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 5 }}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const Categories = [
    { id: 1, name: "Mobile", image: "https://i.ibb.co/4ZhGCKn2/apple-iphone-16-pro-desert-1-3.jpg" },
    { id: 2, name: "Computers", image: "https://i.ibb.co/xqvrtNZD/zh449-1.jpg" },
    { id: 3, name: "TVs", image: "https://i.ibb.co/vvTrVWFD/tv556-1.jpg" },
    { id: 4, name: "Men", image: "https://i.ibb.co/RGzqBrwk/1.jpg" },
    { id: 5, name: "Women", image: "https://i.ibb.co/Kzr7MVxM/1.jpg" },
    { id: 6, name: "Kids", image: "https://i.ibb.co/20TYN7Lz/1.jpg" },
  ];

  const formatNumber = (number) => {
    return new Intl.NumberFormat().format(number);
  };

  const topSellingProducts = useMemo(() => {
    return [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 10);
  }, [products]);

  const newProducts = useMemo(() => {
    return products.slice(-5);
  }, [products]);



  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#E91E63" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLogout} disabled={load}>
            <View style={styles.headerIconContainer}>
              <MaterialIcons name="logout" size={24} color="white" />
            </View>
          </TouchableOpacity>





          <TouchableOpacity onPress={() => router.push("/cart")}>
            <View style={styles.headerIconContainer}>
              <Icon name="shopping-cart" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/Search")}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#888" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Search for products..."
              placeholderTextColor="#aaa"
              editable={false}
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Categories</Text>
        <FlatList
          data={Categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => {
              router.push({
                pathname: "/DisplayCategories",
                params: { title: item.name }
              });
            }}>
              <View style={styles.categoryItem}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.categoryImage}
                  defaultSource={require('../../assets/images/loading-buffering.gif')}
                />
                <Text style={styles.categoryText}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />

        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://b.top4top.io/p_34113iqov1.png' }}
            style={styles.bannerimage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Selling</Text>

        </View>

        {loading && !load ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E91E63" />
          </View>
        ) : (
          <FlatList
            data={topSellingProducts}
            keyExtractor={(item) => item.docId.toString()}
            renderItem={({ item }) => <Item item={item} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New Arrivals</Text>

        </View>

        {loading && !load ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E91E63" />
          </View>
        ) : (
          <FlatList
            data={newProducts}
            keyExtractor={(item) => item.docId.toString()}
            renderItem={({ item }) => <Item item={item} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newIn}
          />
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>

        </View>

        {loading && !load ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E91E63" />
          </View>
        ) : (
          <FlatList
            data={filteredItems.sort(() => Math.random() - 0.5).slice(0, 8)}
            keyExtractor={(item) => item.docId}
            renderItem={({ item }) => <Item item={item} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newIn}
          />
        )}
      </ScrollView>

      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  icon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333"
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  seeAllText: {
    color: "#E91E63",
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 20
  },
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: 'center',
    height: 330,
    justifyContent: 'space-between',
  },
  image: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
    color: '#333',
    height: 40,
  },
  newIn: {
    paddingBottom: 20,
  },
  categoryItem: {
    alignItems: "center",
    marginHorizontal: 10,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
  },
  categoryText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  headerIconContainer: {
    backgroundColor: "#000",
    width: 45,
    height: 45,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  bannerimage: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
    borderRadius: 10,
  },
  imageContainer: {
    width: '100%',
    marginBottom: 20,
  },
  discountContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#E91E63",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  oldPrice: {
    textDecorationLine: "line-through",
    color: "#888",
    fontSize: 15,
    fontWeight: 'bold'
  },
  newPrice: {
    color: "#E91E63",
    fontWeight: "bold",
    fontSize: 16,
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#E91E63',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 20,
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

export default HomePage;