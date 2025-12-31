import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from "react-native-vector-icons/Feather";
import MiniAlert from '../../components/Component/MiniAlert';
import ProductCard from '../../components/Component/ProductCard';
import FilterModal from '../../Modal/FilterModal';
import { darkTheme as cardDarkTheme, lightTheme as cardLightTheme } from '../../Theme/Component/ProductCardTheme';
import { darkTheme, lightTheme } from '../../Theme/Tabs/ProductsTheme';
import {
  getFilteredProductsPage,
  getProductsByIds,
  getProductsPage,
  getSearchProductsPage,
} from '../services/DBAPI.tsx';

const ProductList = () => {
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.searchTerm || '');
  const [intent, setIntent] = useState({
    type: null,
    category: null,
    sort: null,
    priceRange: { min: null, max: null },
    search: params.searchTerm || null,
  });
  const [products, setProducts] = useState([]);
  const [alert, setAlert] = useState({ message: null, type: 'success' });
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [theme, setTheme] = useState(lightTheme);
  const [themeVersion, setThemeVersion] = useState(0);
  const [isFilterModalDarkMode, setIsFilterModalDarkMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageSize = 20;
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [browseCursor, setBrowseCursor] = useState(null);
  const [filteredCursor, setFilteredCursor] = useState(null);
  const [searchCursor, setSearchCursor] = useState(null);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const listRef = useRef(null);

  const applyDiscount = (price, discount = 0) => {
    const priceNum = Number(price) || 0;
    const discountNum = Number(discount) || 0;
    return Math.floor(priceNum - (priceNum * discountNum) / 100);
  };

  const isSearchMode = Boolean(intent.search && String(intent.search).trim().length > 0);
  const isCuratedMode = !isSearchMode && (intent.type === 'TopSelling' || intent.type === 'NewArrival');
  const activeCategory = intent.category && intent.category !== 'All' ? intent.category : null;
  const priceFilterApplied = intent.priceRange?.min !== null || intent.priceRange?.max !== null;
  const serverSideFiltersActive = !isSearchMode && !isCuratedMode && (Boolean(activeCategory) || priceFilterApplied);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: null, type }), 3000);
  };

  const mapSortToOrder = () => {
    switch (intent.sort) {
      case 'name_asc':
        return { field: 'name', direction: 'asc' };
      case 'name_desc':
        return { field: 'name', direction: 'asc' }; // Firestore stays asc; desc handled client-side
      case 'price_asc':
        return { field: 'price', direction: 'asc' };
      case 'price_desc':
        return { field: 'price', direction: 'asc' }; // Firestore stays asc; desc handled client-side
      default:
        return null;
    }
  };

  const sortLocal = (list) => {
    const sorted = [...list];
    switch (intent.sort) {
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'price_asc':
        return sorted.sort((a, b) => {
          const effectiveA = applyDiscount(a.price, a.discount);
          const effectiveB = applyDiscount(b.price, b.discount);
          return effectiveA - effectiveB;
        });
      case 'price_desc':
        return sorted.sort((a, b) => {
          const effectiveA = applyDiscount(a.price, a.discount);
          const effectiveB = applyDiscount(b.price, b.discount);
          return effectiveB - effectiveA;
        });
      default:
        return sorted;
    }
  };

  const applyIntentFilters = (list) => {
    let filtered = list;

    if (isSearchMode) {
      const needle = intent.search.trim().toLowerCase();
      filtered = filtered.filter(item => item?.name?.toLowerCase().includes(needle));
    }

    if (activeCategory) {
      filtered = filtered.filter(item => item?.category === activeCategory);
    }

    const min = intent.priceRange?.min;
    const max = intent.priceRange?.max;
    if (min !== null || max !== null) {
      filtered = filtered.filter(item => {
        const price = applyDiscount(item.price, item.discount);
        const aboveMin = min === null || price >= min;
        const belowMax = max === null || price <= max;
        return aboveMin && belowMax;
      });
    }
    if (intent.sort === null){return filtered;}
    else{return sortLocal(filtered);}
  };

  const fetchCuratedProducts = async () => {
    try {
      const stored = await AsyncStorage.getItem('UpadtingManageDocs');
      const parsed = stored ? JSON.parse(stored) : null;
      const ids = intent.type === 'TopSelling' ? parsed?.TopSelling : parsed?.NewArrival;
      if (!Array.isArray(ids) || ids.length === 0) {
        setProducts([]);
        setHasMore(false);
        return;
      }

      const results = await getProductsByIds(ids.map(String));
      setProducts(results.filter(Boolean));
      setHasMore(false);
    } catch (error) {
      console.error('Failed to load curated products:', error);
      setProducts([]);
      setHasMore(false);
    }
  };

  const fetchPagedProducts = async (cursorArg = null) => {
    const order = mapSortToOrder();
    const result = await getProductsPage({
      limit: pageSize,
      orderBy: order?.field,
      orderDirection: order?.direction,
      cursor: cursorArg,
    });

    setBrowseCursor(result.cursor || null);
    setHasMore(Boolean(result.hasMore));
    setProducts((prev) => (cursorArg ? [...prev, ...(result.items || [])] : (result.items || [])));
  };

  const fetchFilteredProducts = async (cursorArg = null) => {
    const order = mapSortToOrder();
    const orderField = priceFilterApplied ? 'price' : (order?.field || 'name');
    const result = await getFilteredProductsPage({
      limit: pageSize,
      orderBy: orderField,
      orderDirection: 'asc',
      cursor: cursorArg,
      category: activeCategory || null,
      priceMin: intent.priceRange?.min ?? null,
      priceMax: intent.priceRange?.max ?? null,
    });

    setFilteredCursor(result.cursor || null);
    setHasMore(Boolean(result.hasMore));
    setProducts((prev) => (cursorArg ? [...prev, ...(result.items || [])] : (result.items || [])));
  };

  const fetchSearchProducts = async (cursorArg = null) => {
    const result = await getSearchProductsPage({
      limit: pageSize,
      cursor: cursorArg,
      searchText: intent.search || '',
    });

    setSearchCursor(result.cursor || null);
    setHasMore(Boolean(result.hasMore));
    setProducts((prev) => (cursorArg ? [...prev, ...(result.items || [])] : (result.items || [])));
  };

  const loadProducts = async (reset = false) => {
    if (isLoading && !reset) return;
    setIsLoading(true);
    try {
      if (reset) {
        setProducts([]);
        setBrowseCursor(null);
        setFilteredCursor(null);
        setSearchCursor(null);
        setHasMore(true);
      }

      if (isCuratedMode) {
        await fetchCuratedProducts();
        return;
      }

      if (isSearchMode) {
        if (reset) {
          setBrowseCursor(null);
          setFilteredCursor(null);
        }
        await fetchSearchProducts(reset ? null : searchCursor);
        return;
      }

      if (serverSideFiltersActive) {
        if (reset) {
          setBrowseCursor(null);
        }
        await fetchFilteredProducts(reset ? null : filteredCursor);
      } else {
        if (reset) {
          setFilteredCursor(null);
        }
        await fetchPagedProducts(reset ? null : browseCursor);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkTheme = async () => {
    try {
      const themeMode = await AsyncStorage.getItem("ThemeMode");
      const isDarkMode = themeMode === "2";

      if (isDarkMode) {
        setTheme(() => ({
          ...darkTheme,
          inStockColor: cardDarkTheme.inStockColor,
          lowStockColor: cardDarkTheme.lowStockColor,
          outOfStockColor: cardDarkTheme.outOfStockColor,
          outOfStockBorderColor: cardDarkTheme.outOfStockBorderColor,
          disabledButtonBackground: cardDarkTheme.disabledButtonBackground,
          stockContainerBackground: cardDarkTheme.stockContainerBackground,
        }));
      } else {
        setTheme(() => ({
          ...lightTheme,
          inStockColor: cardLightTheme.inStockColor,
          lowStockColor: cardLightTheme.lowStockColor,
          outOfStockColor: cardLightTheme.outOfStockColor,
          outOfStockBorderColor: cardLightTheme.outOfStockBorderColor,
          disabledButtonBackground: cardLightTheme.disabledButtonBackground,
          stockContainerBackground: cardLightTheme.stockContainerBackground,
        }));
      }

      setIsFilterModalDarkMode(isDarkMode);
      setThemeVersion((value) => value + 1);
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProducts(true);
    setIsRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      checkTheme();
    }, [])
  );

  useEffect(() => {
    const incomingSearch = params.searchTerm ? String(params.searchTerm) : '';
    setSearchQuery(incomingSearch);
    setIntent(prev => ({
      ...prev,
      search: incomingSearch.trim() ? incomingSearch : null,
      type: incomingSearch.trim() ? null : prev.type,
    }));
  }, [params.searchTerm]);

  useEffect(() => {
    if (params.category) {
      const category = String(params.category);
      setIntent(prev => ({ ...prev, category }));
    }
  }, [params.category]);

  useEffect(() => {
    setProducts([]);
    setHasMore(true);
    setBrowseCursor(null);
    setFilteredCursor(null);
    setSearchCursor(null);
    loadProducts(true);
  }, [intent]);

  const handleIntentFromFilters = (filters) => {
    setIntent((prev) => ({
      ...prev,
      type: filters.type || null,
      category: filters.category || null,
      sort: filters.sort || null,
      priceRange: filters.priceRange || { min: null, max: null },
    }));
    setIsFilterModalVisible(false);
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setIntent(prev => ({
      ...prev,
      search: text.trim() ? text : null,
      type: text.trim() ? null : prev.type,
    }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setIntent({
      type: null,
      category: null,
      sort: null,
      priceRange: { min: null, max: null },
      search: null,
    });
    setIsFilterModalVisible(false);
    setHasMore(true);
  };

  const filtersApplied = Boolean(
    intent.search ||
    intent.type ||
    activeCategory ||
    intent.sort ||
    (intent.priceRange?.min !== null) ||
    (intent.priceRange?.max !== null)
  );

  const handleLoadMore = () => {
    if (!isCuratedMode && hasMore && !isRefreshing && !isLoading) {
      loadProducts(false);
    }
  };

  const handleScroll = ({ nativeEvent }) => {
    const y = nativeEvent?.contentOffset?.y || 0;
    const vh = nativeEvent?.layoutMeasurement?.height || viewportHeight;
    setScrollOffset(y);
    if (vh !== viewportHeight && vh) {
      setViewportHeight(vh);
    }
    setShowScrollUp(y > 50);
  };

  const scrollToTop = () => {
    if (listRef.current?.scrollToOffset) {
      listRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const scrollToDown = () => {
    if (listRef.current?.scrollToEnd) {
      listRef.current.scrollToEnd({ animated: true });
    } else if (listRef.current?.scrollToOffset) {
      const step = viewportHeight || 4000;
      listRef.current.scrollToOffset({ offset: scrollOffset + step, animated: true });
    }
  };

  const filteredProducts = applyIntentFilters(products);

  const displayTitle = isSearchMode
    ? `Search (${filteredProducts.length})`
    : isCuratedMode
      ? `${intent.type === 'TopSelling' ? 'Top Selling' : 'New Arrival'} (${filteredProducts.length})`
      : `All Products (${filteredProducts.length})`;

  return (
    <View style={styles(theme).container}>
      {alert.message && (
        <MiniAlert
          message={alert.message}
          type={alert.type}
          onHide={() => setAlert({ message: null, type: alert.type })}
        />
      )}

      <View style={styles(theme).header}>
        <Text style={styles(theme).heading}>
          {displayTitle}
        </Text>
      </View>

      <View style={styles(theme).searchContainer}>
        <Icon name="search" size={18} color={theme.searchIconColor} style={styles(theme).searchIcon} />
        <TextInput
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          style={styles(theme).searchInput}
          placeholderTextColor={theme.searchInputPlaceholderColor}
          selectionColor={theme.priceColor}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')} style={styles(theme).clearButton}>
            <Icon name="x" size={16} color={theme.searchIconColor} />
          </TouchableOpacity>
        )}
      </View>

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        selectedCategory={activeCategory || 'All'}
        onApply={handleIntentFromFilters}
        darkMode={isFilterModalDarkMode}
      />

      <FlatList
        ref={listRef}
        data={filteredProducts}
        keyExtractor={item => item.id}
        extraData={themeVersion}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            theme={theme}
            onShowAlert={showAlert}
          />
        )}
        contentContainerStyle={styles(theme).listContainer}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          !hasMore ? (
            <View style={{ paddingVertical: 12 }}>
              <Text style={{ textAlign: 'center', color: theme.searchInputPlaceholderColor }}>No more products</Text>
            </View>
          ) : null
        }
      />

      <View style={styles(theme).floatingButtonsContainer}>
        {filtersApplied && (
          <TouchableOpacity style={styles(theme).floatingResetButton} onPress={resetFilters}>
            <Icon name="rotate-ccw" size={22} color={theme.resetButtonTextColor || theme.headingColor} />
            <Text style={styles(theme).floatingResetText}>Reset</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles(theme).floatingFilterButton}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Icon name="sliders" size={24} color={theme.filterIconColor} />
        </TouchableOpacity>

        <View style={styles(theme).navColumn}>
          <View style={styles(theme).navRow}>
            {showScrollUp && (
              <TouchableOpacity style={styles(theme).floatingNavButton} onPress={scrollToTop}>
                <Icon name="arrow-up" size={18} color={theme.filterIconColor} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles(theme).floatingNavButton} onPress={scrollToDown}>
              <Icon name="arrow-down" size={18} color={theme.filterIconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    backgroundColor: theme.backgroundColor,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.headingColor,
  },
  filterButton: {
    padding: 10,
    backgroundColor: theme.filterButtonBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.filterButtonBorderColor,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.searchInputBackground,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.searchInputBorderColor,
    height: 48,
    shadowColor: theme.searchInputShadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: theme.searchInputTextColor,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 6,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  resetButton: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.filterButtonBorderColor,
    backgroundColor: theme.resetButtonBackground || 'transparent',
  },
  resetText: {
    color: theme.resetButtonTextColor || theme.headingColor,
    fontWeight: '600',
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  navColumn: {
    alignItems: 'flex-end',
    marginLeft: 1,
    position: 'absolute',
    right: 0,
    top: -50,
  },
  navRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  floatingNavButton: {
    backgroundColor: theme.filterButtonBackground,
    borderRadius: 18,
    padding: 10,
    elevation: 5,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: theme.filterButtonBorderColor,
    marginLeft: 6,
  },
  floatingFilterButton: {
    backgroundColor: theme.filterButtonBackground,
    borderRadius: 28,
    padding: 16,
    elevation: 6,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: theme.filterButtonBorderColor,
  },
  floatingRefreshButton: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 12,
    elevation: 6,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    marginLeft: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 6,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    borderWidth: 0,
    marginRight: 1,
    marginBottom: 4,
  },
  floatingResetText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});

export default ProductList;