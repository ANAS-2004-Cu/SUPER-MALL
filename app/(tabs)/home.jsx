import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import MiniAlert from '../../components/Component/MiniAlert';
import ProductCard from '../../components/Component/ProductCard';
import { useUserStore } from '../../store/userStore';
import { darkTheme as cardDarkTheme, lightTheme as cardLightTheme } from '../../Theme/Component/ProductCardTheme';
import { darkTheme, lightTheme } from '../../Theme/Tabs/HomeTheme';
import { getFilteredProductsPage,fetchManageDocs, getProductNameSuggestions, getProductsByIds } from '../services/DBAPI.tsx';

const Categories = [
  { id: 1, name: "Mobile" },
  { id: 2, name: "Computers" },
  { id: 3, name: "TVs" },
  { id: 4, name: "Men" },
  { id: 5, name: "Women" },
  { id: 6, name: "Kids" },
];

const buildMergedTheme = (isDarkMode) => {
  const baseTheme = isDarkMode ? darkTheme : lightTheme;
  const cardTheme = isDarkMode ? cardDarkTheme : cardLightTheme;
  return { ...baseTheme, ...cardTheme };
};

const shuffleArray = (arr = []) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const HORIZONTAL_PADDING = 20;

const HomePage = () => {
  const userSelector = useCallback((state) => state.user, []);
  const preferredCategoriesSelector = useCallback((state) => state.preferredCategories, []);
  const { categories } = useLocalSearchParams();
  const selectedCategories = categories ? JSON.parse(categories) : [];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [load, setLoad] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const limitedSuggestions = useMemo(() => searchSuggestions.slice(0, 4), [searchSuggestions]);
  const [preferredCategories, setPreferredCategories] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [topSellingIds, setTopSellingIds] = useState([]);
  const [newArrivalIds, setNewArrivalIds] = useState([]);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [newArrivalProducts, setNewArrivalProducts] = useState([]);
  const [theme, setTheme] = useState(() => buildMergedTheme(false));
  const [themeVersion, setThemeVersion] = useState(0);
  const [availableCategories, setAvailableCategories] = useState(Categories);
  const [adBanners, setAdBanners] = useState([]);
  const bannerRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const dimensions = useWindowDimensions();
  const BANNER_WIDTH = dimensions.width - 40;
  const user = useUserStore(userSelector);
  const storePreferredCategories = useUserStore(preferredCategoriesSelector);

  const checkTheme = useCallback(async () => {
    try {
      const themeMode = await AsyncStorage.getItem("ThemeMode");
      const isDarkMode = themeMode === "2";
      setTheme(buildMergedTheme(isDarkMode));
      setThemeVersion((value) => value + 1);
    } catch { }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkTheme();
    }, [checkTheme])
  );

  const showAlert = (message, type = 'success') => {
    setLoad(true);
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLoad(false);
    }, 3000);
  };

  const handleCartPress = () => {
    if (!user) {
      showAlert("Please login to access your cart", 'error');
      return;
    }
    router.push('../Cart/cart');
  };

  const preferredCategoriesFromStore = useMemo(() => {
    if (Array.isArray(storePreferredCategories)) return storePreferredCategories;
    if (Array.isArray(user?.preferredCategories)) return user.preferredCategories;
    return [];
  }, [storePreferredCategories, user?.preferredCategories]);

  const fetchRecommendedProducts = useCallback(async () => {
    try {
      const preferred = preferredCategoriesFromStore || [];
      setPreferredCategories(preferred);

      if (preferred.length === 0) {
        setRecommendedProducts([]);
        return;
      }

      const categoryFetches = preferred.map((cat) =>
        getFilteredProductsPage({
          limit: 8,
          category: cat,
        }).catch(() => ({ items: [] }))
      );

      const results = await Promise.all(categoryFetches);
      const merged = results.flatMap((res) => res?.items || []).filter(Boolean);
      const seen = new Set();
      const deduped = merged.filter((item) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      const shuffled = shuffleArray(deduped);
      setRecommendedProducts(shuffled.slice(0, 17));
    } catch {
      setRecommendedProducts([]);
    }
  }, [preferredCategoriesFromStore]);

  const loadCategoriesFromStorage = useCallback(async () => {
    try {
      const manageData = await AsyncStorage.getItem('unUpadtingManageDocs');
      if (manageData) {
        const parsed = JSON.parse(manageData);
        const categoriesArray = parsed?.AvilableCategory || [];
        const formatted = categoriesArray.map((item, index) => {
          if (typeof item === 'string' && item.includes(',')) {
            const [name, image] = item.split(',');
            return { id: index.toString(), name: name.trim(), image: (image || '').trim() };
          }
          return item;
        });
        setAvailableCategories(formatted.length > 0 ? formatted : Categories);
      } else {
        setAvailableCategories(Categories);
      }
    } catch {
      setAvailableCategories(Categories);
    }
  }, []);

  const fetchAdBannersData = useCallback(async () => {
    try {
      const manageData = await AsyncStorage.getItem('UpadtingManageDocs');
      if (manageData) {
        const parsed = JSON.parse(manageData);
        const ads = Array.isArray(parsed?.Ad) ? parsed.Ad : [];
        setAdBanners(ads);
      } else {
        setAdBanners([]);
      }
    } catch {
      setAdBanners([]);
    }
  }, []);

  const loadCuratedSection = useCallback(async (type) => {
    try {
      const manageData = await AsyncStorage.getItem('UpadtingManageDocs');
      const parsed = manageData ? JSON.parse(manageData) : {};
      const ids = type === 'TopSelling' ? parsed?.TopSelling : parsed?.NewArrival;
      if (!Array.isArray(ids) || ids.length === 0) {
        if (type === 'TopSelling') {
          setTopSellingIds([]);
          setTopSellingProducts([]);
        } else {
          setNewArrivalIds([]);
          setNewArrivalProducts([]);
        }
        return;
      }

      const shuffledIds = shuffleArray(ids).slice(0, 9).map(String);
      const productsById = await getProductsByIds(shuffledIds);

      if (type === 'TopSelling') {
        setTopSellingIds(shuffledIds);
        setTopSellingProducts(productsById.slice(0, 9));
      } else {
        setNewArrivalIds(shuffledIds);
        setNewArrivalProducts(productsById.slice(0, 9));
      }
    } catch {
      if (type === 'TopSelling') {
        setTopSellingIds([]);
        setTopSellingProducts([]);
      } else {
        setNewArrivalIds([]);
        setNewArrivalProducts([]);
      }
    }
  }, []);

  useEffect(() => {
    fetchRecommendedProducts();
  }, [fetchRecommendedProducts]);

  const cartCount = useMemo(() => {
    const items = Array.isArray(user?.Cart) ? user.Cart : [];
    return items.length;
  }, [user?.Cart]);

  useEffect(() => {
    const start = async () => {
      setLoading(true);
      try {
        fetchAdBannersData();
        loadCategoriesFromStorage();
        await loadCuratedSection('TopSelling');
        await loadCuratedSection('NewArrival');
      } finally {
        setLoading(false);
      }
    };
    start();
  }, [fetchAdBannersData, loadCategoriesFromStorage, loadCuratedSection]);

  useFocusEffect(
    useCallback(() => {
      loadCategoriesFromStorage();
    }, [loadCategoriesFromStorage])
  );
  const refreshManageDocs = async () => {
  const manageResponse = await fetchManageDocs();

  await AsyncStorage.setItem(
    'UpadtingManageDocs',
    JSON.stringify(manageResponse.UpadtingManageDocs)
  );
};


  const onRefresh = useCallback(
    async () => {
      try {
        setRefreshing(true);
        setLoading(true);
        setSearchSuggestions([]);
        setShowSuggestions(false);
        await refreshManageDocs();
        await Promise.all([
          fetchRecommendedProducts(),
          fetchAdBannersData(),
          loadCategoriesFromStorage(),
          loadCuratedSection('TopSelling'),
          loadCuratedSection('NewArrival'),
          Promise.resolve()
        ].map(p => p.catch ? p : Promise.resolve()));

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchRecommendedProducts, fetchAdBannersData, loadCategoriesFromStorage, loadCuratedSection]
  );

  const favoritesList = useMemo(() => {
    const favs = user?.Fav;
    return Array.isArray(favs) ? favs.map((f) => String(f)) : [];
  }, [user?.Fav]);

  const topSellingList = useMemo(() => {
    if (topSellingProducts.length > 0) return topSellingProducts;
    return [];
  }, [topSellingProducts]);

  const newArrivalList = useMemo(() => {
    if (newArrivalProducts.length > 0) return newArrivalProducts;
    return [];
  }, [newArrivalProducts]);

  useEffect(() => {
    let isActive = true;
    const fetchSuggestions = async () => {
      const normalized = searchQuery.trim().toLowerCase();
      if (normalized.length < 1) {
        if (isActive) {
          setSearchSuggestions([]);
          setShowSuggestions(false);
        }
        return;
      }

      try {
        const result = await getProductNameSuggestions({
          limit: 8,
          searchText: normalized,
        });

        if (isActive) {
          const suggestions = (result.items || []).map((item) => ({ name: item.name }));
          setSearchSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        }
      } catch {
        if (isActive) {
          setSearchSuggestions([]);
          setShowSuggestions(false);
        }
      }
    };

    fetchSuggestions();
    return () => {
      isActive = false;
    };
  }, [searchQuery]);

  const handleSelectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.name);
    setSearchSuggestions([]);
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

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Icon name="alert-circle" size={50} color={theme.accentColor} />
        <Text style={[styles.errorText, { color: theme.errorText }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.retryButtonBackground }]}
          onPress={onRefresh}
        >
          <Text style={[styles.retryButtonText, { color: theme.retryButtonText }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderProductCard = ({ item }) => (
    <ProductCard
      item={item}
      onShowAlert={showAlert}
      theme={theme}
      isFavorite={favoritesList.includes(item.id)}
    />
  );

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <View style={styles.pageWrapper}>
        <ScrollView
          style={[styles.container, { backgroundColor: theme.background }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          {!user ? (
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
              onBlur={() => {
                setSearchSuggestions([]);
                setShowSuggestions(false);
              }}
              onSubmitEditing={() => {
                if (searchQuery.trim()) {
                  router.push({
                    pathname: "/(tabs)/products",
                    params: { searchTerm: searchQuery.trim() }
                  });
                  setSearchSuggestions([]);
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
          {showSuggestions && searchQuery.trim().length >= 1 && limitedSuggestions.length > 0 && (
            <View
              style={[styles.suggestionsDropdown, {
                backgroundColor: theme.suggestionsBackground,
                borderColor: theme.suggestionsBorder,
                shadowColor: theme.searchBarShadow,
              }]}
            >
              {limitedSuggestions.map((item, index) => (
                <TouchableOpacity
                  key={`${item.name}-${index}`}
                  style={[styles.suggestionItem, { borderBottomColor: theme.suggestionItemBorder }]}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Icon name="search" size={16} color={theme.searchIcon} style={styles.suggestionIcon} />
                  <Text style={[styles.suggestionText, { color: theme.suggestionText }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Categories</Text>
        <FlatList
          data={availableCategories}
          keyExtractor={(item) => (item.id ? String(item.id) : String(item.name))}
          extraData={themeVersion}
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
            router.push({
              pathname: "/(tabs)/products",
              params: {
                type: "topSelling"
              }
            });
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
            data={topSellingList}
            keyExtractor={(item) => item.id.toString()}
            extraData={themeVersion}
            renderItem={renderProductCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>New Arrivals</Text>
          <TouchableOpacity onPress={() => {
            router.push({
              pathname: "/(tabs)/products",
              params: {
                type: "newArrival"
              }
            });
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
            data={newArrivalList}
            keyExtractor={(item) => item.id.toString()}
            extraData={themeVersion}
            renderItem={renderProductCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newIn}
          />
        )}
        {recommendedProducts.length > 0 && (
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
                extraData={themeVersion}
                renderItem={renderProductCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.newIn}
              />
            )}
          </>
        )}
        </ScrollView>
      </View>
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
    paddingHorizontal: HORIZONTAL_PADDING,
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
    overflow: 'visible',
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
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 12,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 20,
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
  pageWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'visible',
  },
});

export default HomePage;