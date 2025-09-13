import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, AppState, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import MiniAlert from '../../components/Component/MiniAlert';
import ProductCard from '../../components/Component/ProductCard';
import { auth, createLimit, createOrderBy, getCollection, getUserData } from '../../Firebase/Firebase';
import { darkTheme, lightTheme } from '../../Theme/Tabs/HomeTheme';

const Categories = [
  { id: 1, name: "Mobile", image: "https://i.ibb.co/4ZhGCKn2/apple-iphone-16-pro-desert-1-3.jpg" },
  { id: 2, name: "Computers", image: "https://i.ibb.co/xqvrtNZD/zh449-1.jpg" },
  { id: 3, name: "TVs", image: "https://i.ibb.co/vvTrVWFD/tv556-1.jpg" },
  { id: 4, name: "Men", image: "https://i.ibb.co/RGzqBrwk/1.jpg" },
  { id: 5, name: "Women", image: "https://i.ibb.co/Kzr7MVxM/1.jpg" },
  { id: 6, name: "Kids", image: "https://i.ibb.co/20TYN7Lz/1.jpg" },
];

const HomePage = () => {
  const { categories } = useLocalSearchParams();
  const selectedCategories = categories ? JSON.parse(categories) : [];
  const [storedCategories, setStoredCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = auth.currentUser;
  const router = useRouter();
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [load, setLoad] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [preferredCategories, setPreferredCategories] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  // IDs arrays coming from ProductsManage document
  const [topSellingIds, setTopSellingIds] = useState([]);
  const [newArrivalIds, setNewArrivalIds] = useState([]);
  const [theme, setTheme] = useState(lightTheme);
  const [appState, setAppState] = useState(AppState.currentState);

  const checkTheme = async () => {
    try {
      const themeMode = await AsyncStorage.getItem("ThemeMode");
      setTheme(themeMode === "2" ? darkTheme : lightTheme);
    } catch {}
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        checkTheme();
      }
      setAppState(nextAppState);
    });
    return () => {
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, [appState]);

  useEffect(() => {
    checkTheme();
    const themeCheckInterval = setInterval(checkTheme, 1000);
    return () => {
      clearInterval(themeCheckInterval);
    };
  }, []);

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
        }
      }
    } catch {}
  };

  const getStoredCategories = async () => {
    try {
      const value = await AsyncStorage.getItem('categories');
      if (value) {
        const parsed = JSON.parse(value);
        setStoredCategories(parsed);
      }
    } catch {}
  };

  const fetchPreferredCategories = async () => {
    try {
      const userObjectJson = await AsyncStorage.getItem('UserObject');
      if (userObjectJson) {
        const userObject = JSON.parse(userObjectJson);
        if (userObject && userObject.preferredCategories && userObject.preferredCategories.length > 0) {
          setPreferredCategories(userObject.preferredCategories);
          return userObject.preferredCategories;
        }
      }
      return [];
    } catch {
      return [];
    }
  };

  const fetchRecommendedProducts = useCallback(async () => {
    const categories = await fetchPreferredCategories();
    if (categories.length === 0) return;
    try {
      const response = await getCollection("products");
      if (response.success) {
        const filtered = response.data.filter(product =>
          categories.includes(product.category)
        );
        setRecommendedProducts(filtered.sort(() => Math.random() - 0.5).slice(0, 15));
      }
    } catch {}
  }, []);

  const updateUserDataFromFirebase = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userData = await getUserData(currentUser.uid);
      if (userData) {
        await AsyncStorage.setItem('UserObject', JSON.stringify(userData));
        if (userData.preferredCategories && userData.preferredCategories.length > 0) {
          setPreferredCategories(userData.preferredCategories);
        }
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    const init = async () => {
      await storeCategories();
      await getStoredCategories();
    };
    init();
  }, []);

  useEffect(() => {
    fetchRecommendedProducts();
  }, [fetchRecommendedProducts]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const conditions = [
        createOrderBy("createdAt", "desc"),
        createLimit(20)
      ];
      const response = await getCollection("products", conditions);
      if (response.success) {
        setProducts(response.data);
        setLoading(false);
        setRefreshing(false);
        return true;
      } else {
        setError("Unable to load products. Please try again later.");
        setLoading(false);
        setRefreshing(false);
        return false;
      }
    } catch {
      setError("Something went wrong. Please try again later.");
      setLoading(false);
      setRefreshing(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let unsubscribe;
    const start = async () => {
      await fetchProducts();
      updateUserDataFromFirebase();
    };
    start();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchProducts, updateUserDataFromFirebase]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
    fetchRecommendedProducts();
    updateUserDataFromFirebase();
  }, [fetchProducts, storedCategories, fetchRecommendedProducts, updateUserDataFromFirebase]);

  const fetchAllProducts = useCallback(async () => {
    try {
      const response = await getCollection("products");
      if (response.success) {
        setAllProducts(response.data);
      }
    } catch {}
  }, []);

  // Fetch ProductsManage doc which contains TopSelling and NewArrival arrays of product IDs
  const fetchProductsManage = useCallback(async () => {
    try {
      const response = await getCollection("ProductsManage");
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        const doc = response.data[0];
        setTopSellingIds(Array.isArray(doc.TopSelling) ? doc.TopSelling : []);
        setNewArrivalIds(Array.isArray(doc.NewArrival) ? doc.NewArrival : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAllProducts();
    fetchProductsManage();
  }, [fetchAllProducts, fetchProductsManage]);

  const topSellingProducts = useMemo(() => {
    // If ProductsManage provided IDs, map them to product objects from allProducts preserving order
    if (topSellingIds && topSellingIds.length > 0 && allProducts.length > 0) {
      return topSellingIds
        .map(id => allProducts.find(p => p.id == id))
        .filter(Boolean);
    }
    // fallback to previous behavior
    return [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 15);
  }, [topSellingIds, allProducts, products]);

  const newProducts = useMemo(() => {
    // If ProductsManage provided IDs for new arrivals, map them to product objects
    if (newArrivalIds && newArrivalIds.length > 0 && allProducts.length > 0) {
      return newArrivalIds
        .map(id => allProducts.find(p => p.id == id))
        .filter(Boolean);
    }
    // fallback to previous behavior
    return products.slice(-15);
  }, [newArrivalIds, allProducts, products]);

  const getSearchSuggestions = useCallback((query) => {
    if (!query || query.length < 1) {
      return [];
    }
    const lowercaseQuery = query.toLowerCase().trim();
    return allProducts
      .filter(product => product.name && product.name.toLowerCase().includes(lowercaseQuery))
      .map(product => ({
        id: product.id,
        name: product.name,
        image: product.image
      }))
      .slice(0, 8);
  }, [allProducts]);

  useEffect(() => {
    if (allProducts.length > 0 && searchQuery.length > 0) {
      setSearchSuggestions(getSearchSuggestions(searchQuery));
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, getSearchSuggestions, allProducts]);

  const handleSelectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    router.push({
      pathname: "/(tabs)/products",
      params: { searchTerm: suggestion.name }
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Icon name="alert-circle" size={50} color={theme.accentColor} />
        <Text style={[styles.errorText, { color: theme.errorText }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.retryButtonBackground }]}
          onPress={fetchProducts}
        >
          <Text style={[styles.retryButtonText, { color: theme.retryButtonText }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderProductCard = ({ item }) => (
    <ProductCard
      item={item}
      currentUser={currentUser}
      onShowAlert={showAlert}
      theme={theme}
    />
  );

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}></View>
          <TouchableOpacity onPress={() => router.push("/cart")}>
            <View style={[styles.headerIconContainer, { backgroundColor: theme.headerIconBackground }]}>
              <Icon name="shopping-cart" size={20} color={theme.headerIconColor} />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { 
            backgroundColor: theme.searchBarBackground,
            shadowColor: theme.searchBarShadow
          }]}>
            <Icon name="search" size={20} color={theme.searchIcon} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: theme.inputText }]}
              placeholder="Search for products..."
              placeholderTextColor={theme.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  router.push({
                    pathname: "/(tabs)/products",
                    params: { searchTerm: searchQuery.trim() }
                  });
                  setShowSuggestions(false);
                }
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Icon name="x" size={16} color={theme.searchIcon} />
              </TouchableOpacity>
            )}
          </View>
          {showSuggestions && searchQuery.length > 0 && (
            <View style={[styles.suggestionsContainer, { 
              backgroundColor: theme.suggestionsBackground,
              borderColor: theme.suggestionsBorder,
              shadowColor: theme.searchBarShadow
            }]}>
              {searchSuggestions.length > 0 ? (
                searchSuggestions.map((suggestion, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.suggestionItem, { borderBottomColor: theme.suggestionItemBorder }]}
                    onPress={() => handleSelectSuggestion(suggestion)}
                  >
                    <Icon name="search" size={16} color={theme.searchIcon} style={styles.suggestionIcon} />
                    <Text style={[styles.suggestionText, { color: theme.suggestionText }]} numberOfLines={1}>
                      {suggestion.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.suggestionItem}>
                  <Icon name="info" size={16} color={theme.searchIcon} style={styles.suggestionIcon} />
                  <Text style={[styles.noResultsText, { color: theme.noResultsText }]}>No matching products</Text>
                </View>
              )}
            </View>
          )}
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
        <FlatList
          data={Categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => {
              router.push({
                pathname: "/(tabs)/products",
                params: { category: item.name }
              });
            }}>
              <View style={styles.categoryItem}>
                <Image
                  source={{ uri: item.image }}
                  style={[styles.categoryImage, { backgroundColor: theme.categoryImageBackground }]}
                  defaultSource={require('../../assets/images/loading-buffering.gif')}
                />
                <Text style={[styles.categoryText, { color: theme.categoryText }]}>{item.name}</Text>
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Selling</Text>
          <TouchableOpacity onPress={() => {
            const idsForNav = (topSellingIds && topSellingIds.length > 0)
              ? topSellingIds
              : (topSellingProducts || []).map(p => p.id).filter(Boolean);
            if (idsForNav && idsForNav.length > 0) {
              router.push({
                pathname: "/(tabs)/products",
                params: {
                  sectionTitle: "Top Selling",
                  // encode to preserve brackets/commas when passed in URL params
                  sectionIds: encodeURIComponent(JSON.stringify(idsForNav))
                }
              });
            }
          }}>
            <Text style={[styles.seeAllText, { color: theme.accentColor }]}>Show More</Text>
          </TouchableOpacity>
        </View>
        {loading && !load ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.loadingIndicator} />
          </View>
        ) : (
          <FlatList
            data={topSellingProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProductCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>New Arrivals</Text>
          <TouchableOpacity onPress={() => {
            const idsForNav = (newArrivalIds && newArrivalIds.length > 0)
              ? newArrivalIds
              : (newProducts || []).map(p => p.id).filter(Boolean);
            if (idsForNav && idsForNav.length > 0) {
              router.push({
                pathname: "/(tabs)/products",
                params: {
                  sectionTitle: "New Arrivals",
                  // encode to preserve brackets/commas when passed in URL params
                  sectionIds: encodeURIComponent(JSON.stringify(idsForNav))
                }
              });
            }
          }}>
            <Text style={[styles.seeAllText, { color: theme.accentColor }]}>Show More</Text>
          </TouchableOpacity>
        </View>
        {loading && !load ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.loadingIndicator} />
          </View>
        ) : (
          <FlatList
            data={newProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProductCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newIn}
          />
        )}
        {preferredCategories.length > 0 && recommendedProducts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended For You</Text>
            </View>
            {loading && !load ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.loadingIndicator} />
              </View>
            ) : (
              <FlatList
                data={recommendedProducts}
                keyExtractor={(item) => item.id}
                renderItem={renderProductCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.newIn}
              />
            )}
          </>
        )}
      </ScrollView>
      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
          theme={theme}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  searchContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  icon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    borderRadius: 10,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    zIndex: 20,
    overflow: 'hidden',
    borderWidth: 1,
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 14,
    flex: 1,
  },
  noResultsText: {
    fontSize: 14,
    fontStyle: 'italic',
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
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 20
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
  },
  categoryText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  headerIconContainer: {
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
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  retryButtonText: {
    fontWeight: 'bold',
  },
});

export default HomePage;