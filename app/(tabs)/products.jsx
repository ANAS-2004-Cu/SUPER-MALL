import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { AppState, Dimensions, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from "react-native-vector-icons/Feather";
import MiniAlert from '../../components/Component/MiniAlert';
import ProductCard from '../../components/Component/ProductCard';
import { getCollection, onAuthStateChange } from '../../Firebase/Firebase';
import FilterModal from '../../Modal/FilterModal';
import { darkTheme, lightTheme } from '../../Theme/Tabs/ProductsTheme';

const ProductList = () => {
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.searchTerm || '');
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [alert, setAlert] = useState({ message: null, type: 'success' });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [categories, setCategories] = useState(['All']);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [theme, setTheme] = useState(lightTheme);
  const [isFilterModalDarkMode, setIsFilterModalDarkMode] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // new states to support "section IDs" view
  const [sectionIds, setSectionIds] = useState([]); // array of ids (may come encoded)
  const [sectionTitle, setSectionTitle] = useState(null);
  const [isSectionView, setIsSectionView] = useState(false);

  // new filter flags controlled by modal
  const [filterTopSelling, setFilterTopSelling] = useState(false);
  const [filterNewArrival, setFilterNewArrival] = useState(false);

  // track if any filter/search/section is active so "Reset" can be shown
  const [filtersApplied, setFiltersApplied] = useState(false);
  const defaultCategory = 'All';
  const defaultSort = 'name';

  const applyDiscount = (price, discount = 0) => Math.floor(price - (price * discount) / 100);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: null, type }), 3000);
  };

  const checkTheme = async () => {
    try {
      const themeMode = await AsyncStorage.getItem("ThemeMode");
      if (themeMode === "2") {
        setTheme(darkTheme);
        setIsFilterModalDarkMode(true);
      } else {
        setTheme(lightTheme);
        setIsFilterModalDarkMode(false);
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  const refreshProducts = async () => {
    setIsRefreshing(true);
    try {
      const result = await getCollection("products");
      if (result.success) {
        setProducts(result.data);
        if (result.data.length > 0) {
          const highestPrice = Math.max(...result.data.map(product => product.price));
          const roundedPrice = Math.ceil(highestPrice / 100) * 100;
          setMaxPrice(roundedPrice);
          setPriceRange([0, roundedPrice]);
        }
        await fetchProductsManage();
        await loadAvailableCategoriesFromStorage();
      }
    } finally {
      setIsRefreshing(false);
    }
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
    const unsubscribeAuth = onAuthStateChange(setCurrentUser);

    getCollection("products").then(result => {
      if (result.success) {
        setProducts(result.data);
        if (result.data.length > 0) {
          const highestPrice = Math.max(...result.data.map(product => product.price));
          const roundedPrice = Math.ceil(highestPrice / 100) * 100;
          setMaxPrice(roundedPrice);
          setPriceRange([0, roundedPrice]);
        }
      }
      fetchProductsManage();
      loadAvailableCategoriesFromStorage();
    });

    return () => {
      unsubscribeAuth();
      clearInterval(themeCheckInterval);
    };
  }, []);

  useEffect(() => {
    if (params.searchTerm) {
      setSearchQuery(params.searchTerm);
    }
  }, [params.searchTerm]);

  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category);
    }
  }, [params.category]);

  useEffect(() => {
    if (params.sectionIds) {
      try {
        const raw = params.sectionIds;
        const decoded = typeof raw === 'string' ? decodeURIComponent(raw) : raw;
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          setSectionIds(parsed);
          setIsSectionView(true);
        } else {
          setSectionIds([]);
          setIsSectionView(false);
        }
      } catch (e) {
        setSectionIds([]);
        setIsSectionView(false);
      }
    } else {
      setSectionIds([]);
      setIsSectionView(false);
    }

    if (params.sectionTitle) {
      setSectionTitle(params.sectionTitle);
    } else {
      setSectionTitle(null);
    }
  }, [params.sectionIds, params.sectionTitle]);

  const applyFilters = (filters) => {
    if (filters.sectionIds && Array.isArray(filters.sectionIds)) {
      setSectionIds(filters.sectionIds);
      setSectionTitle(filters.sectionTitle || null);
      setIsSectionView(true);
      setFiltersApplied(true);
      setIsFilterModalVisible(false);
      return;
    }
    setSelectedCategory(filters.category);
    setSortBy(filters.sortBy);
    setPriceRange(filters.priceRange);
    setFilterTopSelling(!!filters.topSelling);
    setFilterNewArrival(!!filters.newArrival);
    setIsFilterModalVisible(false);
    setIsSectionView(false);
    setSectionIds([]);
    setSectionTitle(null);
    setFiltersApplied(true);
  };

  const resetFilters = () => {
    setSelectedCategory(defaultCategory);
    setSortBy(defaultSort);
    setPriceRange([0, maxPrice]);
    setSearchQuery('');
    setIsSectionView(false);
    setSectionIds([]);
    setSectionTitle(null);
    setFiltersApplied(false);
    setIsFilterModalVisible(false);
    setFilterTopSelling(false);
    setFilterNewArrival(false);
  };

  useEffect(() => {
    const nonDefault =
      isSectionView ||
      selectedCategory !== defaultCategory ||
      sortBy !== defaultSort ||
      priceRange[0] !== 0 ||
      priceRange[1] !== maxPrice ||
      (searchQuery && searchQuery.length > 0) ||
      filterTopSelling ||
      filterNewArrival;
    setFiltersApplied(nonDefault);
  }, [isSectionView, selectedCategory, sortBy, priceRange, searchQuery, maxPrice, filterTopSelling, filterNewArrival]);

  const fetchProductsManage = async () => {
    try {
      const response = await getCollection("ProductsManage");
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        const doc = response.data[0];
        const rawCats =
          doc.AvilableCategory;
        if (rawCats !== null) {
          try {
            await AsyncStorage.setItem('AvilableCategory', JSON.stringify(rawCats));
          } catch (e) {
            console.warn('Failed to save AvilableCategory to AsyncStorage', e);
          }
        }
        setFilterTopSelling(Boolean(doc.TopSelling && doc.TopSelling.length > 0) ? filterTopSelling : filterTopSelling);
      }
    } catch (e) {
    }
  };

  const loadAvailableCategoriesFromStorage = async () => {
    try {
      const raw = await AsyncStorage.getItem('AvilableCategory');
      if (!raw) {
        setCategories(['All']);
        return;
      }

      let arr;
      try {
        arr = JSON.parse(raw);
      } catch {
        arr = [raw];
      }

      if (!Array.isArray(arr) || arr.length === 0) {
        setCategories(['All']);
        return;
      }

      const parsedNames = arr
        .map((c, idx) => {
          if (!c) return null;
          if (typeof c === 'string') {
            const stripped = c.replace(/^\s*\{?\s*/, '').replace(/\s*\}?\s*$/, '');
            const [namePart] = stripped.split(',');
            const name = (namePart || '').trim();
            return name || null;
          }
          if (typeof c === 'object') {
            const name = c.categoryname || c.categoryName || c.name || c.category || c.title || '';
            return name || null;
          }
          return null;
        })
        .filter(Boolean);

      const final = ['All', ...new Set(parsedNames)];
      setCategories(final.length > 0 ? final : ['All']);
    } catch {
      setCategories(['All']);
    }
  };

  const getFilteredAndSortedProducts = () => {
    if (filterTopSelling || filterNewArrival) {
      const topList = filterTopSelling
        ? [...products].filter(p => (p.sold || 0) > 0).sort((a, b) => (b.sold || 0) - (a.sold || 0))
        : [];
      const newList = filterNewArrival
        ? [...products].sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          })
        : [];
      if (filterTopSelling && !filterNewArrival) return topList;
      if (filterNewArrival && !filterTopSelling) return newList;
      const seen = new Set();
      const union = [];
      topList.forEach(p => { if (!seen.has(String(p.id))) { seen.add(String(p.id)); union.push(p); }});
      newList.forEach(p => { if (!seen.has(String(p.id))) { seen.add(String(p.id)); union.push(p); }});
      return union;
    }

    if (isSectionView && sectionIds && sectionIds.length > 0) {
      return sectionIds
        .map(id => products.find(p => String(p.id) === String(id)))
        .filter(Boolean);
    }

    let filtered = products.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const price = applyDiscount(item.price, item.discount);
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
      return matchesSearch && matchesCategory && matchesPrice;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priceLow':
          return applyDiscount(a.price, a.discount) - applyDiscount(b.price, b.discount);
        case 'priceHigh':
          return applyDiscount(b.price, b.discount) - applyDiscount(a.price, a.discount);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  };

  const filteredProducts = getFilteredAndSortedProducts();

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
          {sectionTitle
            ? `${sectionTitle} (${filteredProducts.length})`
            : "All Products"}
        </Text>
      </View>

      <View style={styles(theme).searchContainer}>
        <Icon name="search" size={18} color={theme.searchIconColor} style={styles(theme).searchIcon} />
        <TextInput
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles(theme).searchInput}
          placeholderTextColor={theme.searchInputPlaceholderColor}
          selectionColor={theme.priceColor}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles(theme).clearButton}>
            <Icon name="x" size={16} color={theme.searchIconColor} />
          </TouchableOpacity>
        )}
      </View>

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onApply={applyFilters}
        maxPrice={maxPrice}
        darkMode={isFilterModalDarkMode}
        topSelling={filterTopSelling}
        newArrival={filterNewArrival}
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            customTheme={theme}
            currentUser={currentUser}
            onShowAlert={showAlert}
          />
        )}
        contentContainerStyle={styles(theme).listContainer}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshProducts}
            colors={['#1976D2']}
          />
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
      </View>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
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
    bottom: 24,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
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
    marginRight: 8,
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