import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Dimensions, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import MiniAlert from '../../components/Component/MiniAlert';
import ProductCard from '../../components/Component/ProductCard';
import { auth, createLimit, createOrderBy, getCollection, getUserData } from '../../Firebase/Firebase';
import { darkTheme, lightTheme } from '../../Theme/Tabs/HomeTheme';

const Categories = [
  { id: 1, name: "Mobile" },
  { id: 2, name: "Computers" },
  { id: 3, name: "TVs" },
  { id: 4, name: "Men" },
  { id: 5, name: "Women" },
  { id: 6, name: "Kids" },
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
  const [topSellingIds, setTopSellingIds] = useState([]);
  const [newArrivalIds, setNewArrivalIds] = useState([]);
  const [theme, setTheme] = useState(lightTheme);
  const [appState, setAppState] = useState(AppState.currentState);
  const [availableCategories, setAvailableCategories] = useState(Categories);
  const [adBanners, setAdBanners] = useState([]);
  const bannerRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const windowWidth = Dimensions.get('window').width;
  const dimensions = useWindowDimensions();

  const checkTheme = async () => {
    try {
      const themeMode = await AsyncStorage.getItem("ThemeMode");
      setTheme(themeMode === "2" ? darkTheme : lightTheme);
    } catch { }
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

  // Add: check login before navigating to Cart
  const handleCartPress = async () => {
    try {
      const userJson = await AsyncStorage.getItem('UserObject');
      const isLoggedIn = !!auth.currentUser || (!!userJson && userJson !== "undefined");
      if (!isLoggedIn) {
        showAlert("Please login to access your cart", 'error');
        return;
      }
      router.push("/cart");
    } catch {
      showAlert("Please login to access your cart", 'error');
    }
  };

  const storeCategories = async () => {
    try {
      if (selectedCategories.length > 0) {
        const existing = await AsyncStorage.getItem('categories');
        if (!existing) {
          await AsyncStorage.setItem('categories', JSON.stringify(selectedCategories));
        }
      }
    } catch { }
  };

  const getStoredCategories = async () => {
    try {
      const value = await AsyncStorage.getItem('categories');
      if (value) {
        const parsed = JSON.parse(value);
        setStoredCategories(parsed);
      }
    } catch { }
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
    } catch { }
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
    } catch { }
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

  const loadAvailableCategoriesFromStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('AvilableCategory');
      if (!raw) {
        setAvailableCategories(Categories);
        return;
      }

      let arr;
      try {
        arr = JSON.parse(raw);
      } catch {
        arr = [raw];
      }

      if (!Array.isArray(arr) || arr.length === 0) {
        setAvailableCategories(Categories);
        return;
      }

      const parsed = arr
        .map((c, idx) => {
          if (!c) return null;
          if (typeof c === 'string') {
            const stripped = c.replace(/^\s*\{?\s*/, '').replace(/\s*\}?\s*$/, '');
            const [namePart, ...rest] = stripped.split(',');
            const name = (namePart || '').trim();
            const image = (rest.length > 0 ? rest.join(',').trim() : '') || '';
            if (!name) return null;
            return { id: `pm-${idx}`, name, image };
          }
          if (typeof c === 'object') {
            const name = c.categoryname || c.categoryName || c.name || c.category || c.title || '';
            const image = c.categoriimage || c.categoryimage || c.categoryImage || c.image || c.img || '';
            const id = c.id || c._id || `pm-${idx}`;
            if (!name) return null;
            return { id, name, image };
          }
          return null;
        })
        .filter(Boolean);

      if (parsed.length > 0) {
        setAvailableCategories(parsed);
      } else {
        setAvailableCategories(Categories);
      }
    } catch {
      setAvailableCategories(Categories);
    }
  }, []);

  const fetchAllProducts = useCallback(async () => {
    try {
      const response = await getCollection("products");
      if (response.success) {
        setAllProducts(response.data);
      }
    } catch { }
  }, []);

  const fetchProductsManage = useCallback(async () => {
    try {
      const response = await getCollection("ProductsManage");
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        const doc = response.data[0];
        setTopSellingIds(Array.isArray(doc.TopSelling) ? doc.TopSelling : []);
        setNewArrivalIds(Array.isArray(doc.NewArrival) ? doc.NewArrival : []);
        
        // Add this code to fetch ad banners
        if (Array.isArray(doc.Ad)) {
          setAdBanners(doc.Ad);
          // Reset current banner index when banners are loaded
          setCurrentBannerIndex(0);
        }
        
        // store the raw AvilableCategory (if present) to AsyncStorage so loadAvailableCategoriesFromStorage reads it
        const rawCats =
          doc.AvilableCategory;
        if (rawCats !== null) {
          try {
            await AsyncStorage.setItem('AvilableCategory', JSON.stringify(rawCats));
          } catch (e) {
            console.warn('Failed to save AvilableCategory to AsyncStorage', e);
          }
        }
      }
    } catch { }
  }, []);

  useEffect(() => {
    let unsubscribe;
    const start = async () => {
      await fetchProducts();
      updateUserDataFromFirebase();
      loadAvailableCategoriesFromStorage();
    };
    start();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchProducts, updateUserDataFromFirebase, loadAvailableCategoriesFromStorage]);

  const onRefresh = useCallback(
    async () => {
      try {
        setRefreshing(true);
        // run independent fetches in parallel where possible
        await Promise.all([
          fetchProducts(),
          fetchRecommendedProducts(),
          updateUserDataFromFirebase(),
          fetchAllProducts()
        ].map(p => p.catch ? p : Promise.resolve()));

        // ensure ProductsManage is fetched and stored before reloading categories from storage
        await fetchProductsManage();
        await loadAvailableCategoriesFromStorage();
      } finally {
        setRefreshing(false);
      }
    },
    [fetchProducts, fetchRecommendedProducts, updateUserDataFromFirebase, fetchAllProducts, fetchProductsManage, loadAvailableCategoriesFromStorage]
  );

  useEffect(() => {
    fetchAllProducts();
    fetchProductsManage();
    loadAvailableCategoriesFromStorage();
  }, [fetchAllProducts, fetchProductsManage, loadAvailableCategoriesFromStorage]);

  const topSellingProducts = useMemo(() => {
    if (topSellingIds && topSellingIds.length > 0 && allProducts.length > 0) {
      return topSellingIds
        .map(id => allProducts.find(p => p.id == id))
        .filter(Boolean);
    }
    return [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 15);
  }, [topSellingIds, allProducts, products]);

  const newProducts = useMemo(() => {
    if (newArrivalIds && newArrivalIds.length > 0 && allProducts.length > 0) {
      return newArrivalIds
        .map(id => allProducts.find(p => p.id == id))
        .filter(Boolean);
    }
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

  const handleBannerPress = (item) => {
    if (!item) return;
    
    // Check the action type and navigate accordingly
    switch (item.action) {
      case "navigate":
        if (item.id) {
          router.push({
            pathname: "../singlepage",
            params: { id: item.id }
          });
        }
        break;
        
      case "search":
        if (item.SearchKey) {
          router.push({
            pathname: "/(tabs)/products",
            params: { searchTerm: item.SearchKey }
          });
        }
        break;
        
      case "offer":
      default:
        // Default behavior - go to ad detail page
        const imgParam = item && item.img ? encodeURIComponent(item.img) : "";
        const contentParam = item && item.content ? encodeURIComponent(item.content) : "";
        
        router.push({
          pathname: "../Pages/ad-detail",
          params: { 
            image: imgParam,
            content: contentParam
          }
        });
        break;
    }
  };

  // Auto-scroll banner effect
  useEffect(() => {
    if (!adBanners || adBanners.length <= 1) return;
    
    const bannerInterval = setInterval(() => {
      if (bannerRef.current) {
        let nextIndex = (currentBannerIndex + 1) % adBanners.length;
        setCurrentBannerIndex(nextIndex);
        
        bannerRef.current.scrollToIndex({
          index: nextIndex,
          animated: true,
          viewPosition: 0
        });
      }
    }, 3000); // Change banner every 3 seconds
    
    return () => clearInterval(bannerInterval);
  }, [adBanners, currentBannerIndex]);

  // Handle scroll end to update current index
  const handleBannerScroll = useCallback((event) => {
    if (!adBanners || adBanners.length <= 1) return;
    
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (windowWidth - 40));
    setCurrentBannerIndex(index);
  }, [adBanners, windowWidth]);

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
          <TouchableOpacity onPress={handleCartPress}>
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
          data={availableCategories}
          keyExtractor={(item) => (item.id ? String(item.id) : String(item.name))}
          renderItem={({ item }) => {
            const display = (typeof item === 'string') ? { name: item, image: '' } : item;
            const hasImage = Boolean(display.image && String(display.image).trim().length > 0);
            return (
              <TouchableOpacity onPress={() => {
                router.push({
                  pathname: "/(tabs)/products",
                  params: { category: display.name }
                });
              }}>
                <View style={styles.categoryItem}>
                  {hasImage ? (
                    <Image
                      source={{ uri: String(display.image) }}
                      style={[styles.categoryImage, { backgroundColor: theme.categoryImageBackground }]}
                      defaultSource={require('../../assets/images/loading-buffering.gif')}
                    />
                  ) : (
                    <View style={[styles.categoryImage, { backgroundColor: theme.categoryImageBackground, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ color: theme.categoryText, fontWeight: '700' }}>
                        {display.name ? String(display.name).charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.categoryText, { color: theme.categoryText }]}>{display.name}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
        <View style={styles.adBannerContainer}>
          {adBanners.length > 0 ? (
            <>
              <FlatList
                ref={bannerRef}
                data={adBanners}
                keyExtractor={(item, index) => `ad-banner-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => handleBannerPress(item)} 
                    style={[
                      styles.adBannerItemContainer, 
                      { width: dimensions.width - 40 }
                    ]}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: item.img }}
                      style={styles.adBannerImage}
                      resizeMode="contain" // Changed to "contain" to ensure full width is visible
                      defaultSource={require('../../assets/images/loading-buffering.gif')}
                    />
                  </TouchableOpacity>
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                onMomentumScrollEnd={handleBannerScroll}
                snapToAlignment="center"
                snapToInterval={dimensions.width - 40}
                decelerationRate="fast"
                contentContainerStyle={styles.adBannerContentContainer}
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise(resolve => setTimeout(resolve, 500));
                  wait.then(() => {
                    if (bannerRef.current) {
                      bannerRef.current.scrollToIndex({ 
                        index: info.index, 
                        animated: true 
                      });
                    }
                  });
                }}
              />
              <View style={styles.paginationContainer}>
                {adBanners.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      { backgroundColor: index === currentBannerIndex ? theme.accentColor : theme.paginationInactive || '#ccc' }
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <Image
              source={{ uri: 'https://b.top4top.io/p_34113iqov1.png' }}
              style={styles.bannerimage}
              resizeMode="contain"
            />
          )}
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
    paddingTop: 30,
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
    height: undefined,
    aspectRatio: 2.5, // Default fallback aspect ratio if no banner images
    resizeMode: 'contain',
    borderRadius: 10,
  },
  adBannerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  adBannerItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    overflow: 'visible', // Changed from 'hidden' to 'visible' to ensure full width is shown
    paddingHorizontal: 0, // Remove horizontal padding
  },
  adBannerImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 2.5, // Default aspect ratio
    borderRadius: 10,
  },
  adBannerContentContainer: {
    paddingBottom: 10,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
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