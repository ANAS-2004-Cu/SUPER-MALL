import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import MiniAlert from '../../components/Component/MiniAlert';
import ProductCard from '../../components/Component/ProductCard';
import { auth, createLimit, createOrderBy, getCollection, getUserCart, getUserData, listenToUserFavorites, loadCachedCategories, loadCachedPreferredCategories, syncAvailableCategories, toggleFavorite } from '../../Firebase/Firebase';
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
  const dimensions = useWindowDimensions();
  const BANNER_WIDTH = dimensions.width - 40;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [favoritesList, setFavoritesList] = useState([]);

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

  useEffect(() => {
    const userId = currentUser?.uid;
    if (userId) {
      // Start the listener
      const unsubscribe = listenToUserFavorites(userId, (favoritesArray) => {
        setFavoritesList(favoritesArray);
      });
      
      // Return the cleanup function
      return () => unsubscribe();
    } else {
      setFavoritesList([]);
    }
  }, [currentUser]); // Dependency is on currentUser

  const showAlert = (message, type = 'success') => {
    setLoad(true);
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLoad(false);
    }, 3000);
  };

  const handleCartPress = async () => {
    try {
      const userJson = await AsyncStorage.getItem('UserObject');
      const isLoggedIn = !!auth.currentUser || (!!userJson && userJson !== "undefined");
      if (!isLoggedIn) {
        showAlert("Please login to access your cart", 'error');
        return;
      }
      router.push("../Cart/cart");
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

  const fetchPreferredCategories = useCallback(async () => {
    try {
      const cats = await loadCachedPreferredCategories();
      setPreferredCategories(cats);
    } catch {
      setPreferredCategories([]);
    }
  }, []);

  const fetchRecommendedProducts = useCallback(async () => {
    const categories = await loadCachedPreferredCategories();
    if (categories.length === 0) {
      setRecommendedProducts([]);
      return;
    }
    setPreferredCategories(categories);
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
        // After updating user data from firebase, reload preferred categories from cache
        await fetchPreferredCategories();
      }
    } catch { }
  }, [currentUser, fetchPreferredCategories]);

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

  const fetchAllProducts = useCallback(async () => {
    try {
      const response = await getCollection("products");
      if (response.success) {
        setAllProducts(response.data);
      }
    } catch { }
  }, []);

  const loadCartCount = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        setCartCount(0);
        return;
      }
      const items = await getUserCart(auth.currentUser.uid);
      const total = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
      setCartCount(total);
    } catch {
      setCartCount(0);
    }
  }, []);

  const checkLoginStatus = useCallback(async () => {
    try {
      const userJson = await AsyncStorage.getItem('UserObject');
      const logged = !!auth.currentUser || (userJson && userJson !== "undefined");
      setIsLoggedIn(!!logged);
      if (logged) loadCartCount();
      else setCartCount(0);
    } catch {
      setIsLoggedIn(false);
      setCartCount(0);
    }
  }, [loadCartCount]);

  useEffect(() => {
    let unsubscribe;
    const start = async () => {
      await fetchProducts();
      updateUserDataFromFirebase();
      const { success, data: cats } = await syncAvailableCategories();
      if (success && cats.length > 0) {
        setAvailableCategories(cats);
      } else {
        setAvailableCategories(Categories);
      }
    };
    start();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchProducts, updateUserDataFromFirebase]);

  useFocusEffect(
    useCallback(() => {
      const loadCats = async () => {
        const { data: cats } = await loadCachedCategories();
        if (cats && cats.length > 0) {
          setAvailableCategories(cats);
        }
      };
      loadCats();
      checkLoginStatus();
    }, [checkLoginStatus])
  );

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus, currentUser]);

  const onRefresh = useCallback(
    async () => {
      try {
        setRefreshing(true);
        await Promise.all([
          fetchProducts(),
          fetchRecommendedProducts(),
          updateUserDataFromFirebase(),
          fetchAllProducts(),
          checkLoginStatus(),
          syncAvailableCategories().then(({ success, data: cats }) => {
            if (success && cats.length > 0) {
              setAvailableCategories(cats);
            } else {
              setAvailableCategories(Categories);
            }
          })
        ].map(p => p.catch ? p : Promise.resolve()));

        await loadCartCount();
      } finally {
        setRefreshing(false);
      }
    },
    [fetchProducts, fetchRecommendedProducts, updateUserDataFromFirebase, fetchAllProducts, checkLoginStatus, loadCartCount]
  );

  useEffect(() => {
    fetchAllProducts();
    (async () => {
      const { success, data: cats } = await syncAvailableCategories();
      if (success && cats.length > 0) {
        setAvailableCategories(cats);
      } else {
        setAvailableCategories(Categories);
      }
    })();
  }, [fetchAllProducts]);

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
    
    switch (item.action) {
      case "navigate":
        if (item.id) {
          router.push({
            pathname: "../Pages/singlepage",
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

  useEffect(() => {
    if (!adBanners || adBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => {
        const next = (prev + 1) % adBanners.length;
        if (bannerRef.current) {
          try {
            bannerRef.current.scrollToOffset({
              offset: next * BANNER_WIDTH,
              animated: true
            });
          } catch {}
        }
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [adBanners, BANNER_WIDTH]);

  const handleBannerScroll = useCallback((event) => {
    if (!adBanners || adBanners.length <= 1) return;
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / BANNER_WIDTH);
    if (index !== currentBannerIndex) setCurrentBannerIndex(index);
  }, [adBanners, BANNER_WIDTH, currentBannerIndex]);

  const scrollToBanner = useCallback((index) => {
    if (!adBanners || index < 0 || index >= adBanners.length) return;
    setCurrentBannerIndex(index);
    if (bannerRef.current) {
      try {
        bannerRef.current.scrollToOffset({
          offset: index * BANNER_WIDTH,
          animated: true
        });
      } catch {}
    }
  }, [adBanners, BANNER_WIDTH]);

  const handleFavoriteToggle = async (productId) => {
    try {
      if (!auth.currentUser) {
        showAlert("Please login to add items to your favorites", 'error');
        return;
      }
      await toggleFavorite(auth.currentUser.uid, productId);
    } catch { }
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
      isFavorite={favoritesList.includes(item.id)}
      onFavoriteToggle={handleFavoriteToggle}
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
          {!isLoggedIn ? (
            <TouchableOpacity onPress={() => router.push("/Authentication/Login")}>
              <View
                style={[
                  styles.headerLoginContainer,
                  { backgroundColor: theme.headerIconBackground }
                ]}
              >
                <Icon name="log-in" size={20} color={theme.headerIconColor} />
                <Text style={[styles.loginText, { color: theme.headerIconColor }]}>
                  Login
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 45 }} />
          )}
          <TouchableOpacity onPress={handleCartPress}>
            <View style={[styles.headerIconContainer, { backgroundColor: theme.headerIconBackground }]}>
              <Icon name="shopping-cart" size={20} color={theme.headerIconColor} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              )}
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
                      { width: BANNER_WIDTH }
                    ]}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: item.img }}
                      style={styles.adBannerImage}
                      resizeMode="contain"
                      defaultSource={require('../../assets/images/loading-buffering.gif')}
                    />
                  </TouchableOpacity>
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                onMomentumScrollEnd={handleBannerScroll}
                snapToAlignment="center"
                snapToInterval={BANNER_WIDTH}
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                  length: BANNER_WIDTH,
                  offset: BANNER_WIDTH * index,
                  index
                })}
                contentContainerStyle={styles.adBannerContentContainer}
              />
              <View style={styles.paginationContainer}>
                {adBanners.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => scrollToBanner(index)}
                    activeOpacity={0.8}
                    style={[
                      styles.paginationDot,
                      {
                        backgroundColor:
                          index === currentBannerIndex
                            ? theme.accentColor
                            : theme.paginationInactive || '#ccc'
                      }
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
    position: 'relative',
  },
  headerLoginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 45,
    borderRadius: 20,
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  loginText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  bannerimage: {
    width: '100%',
    height: undefined,
    aspectRatio: 2.5,
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
    overflow: 'visible',
    paddingHorizontal: 0,
  },
  adBannerImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 2.5,
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
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e53935',
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700'
  },
});

export default HomePage;