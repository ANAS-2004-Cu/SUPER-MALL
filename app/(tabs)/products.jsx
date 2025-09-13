import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { AppState, Dimensions, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from "react-native-vector-icons/Feather";
import MiniAlert from '../../components/Component/MiniAlert';
import ProductCard from '../../components/Component/ProductCard';
import { getCollection, onAuthStateChange } from '../../Firebase/Firebase';
import FilterModal from '../../Modal/FilterModal';
import { darkTheme, lightTheme } from '../../Theme/Tabs/ProductsTheme';

const { width } = Dimensions.get('window');

const ProductList = () => {
  const router = useRouter();
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
  const defaultPriceRange = [0, maxPrice]; // maxPrice is state and may update after products load

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
        const uniqueCategories = ['All', ...new Set(result.data.map(product => product.category).filter(Boolean))];
        setCategories(uniqueCategories);

        if (result.data.length > 0) {
          const highestPrice = Math.max(...result.data.map(product => product.price));
          const roundedPrice = Math.ceil(highestPrice / 100) * 100;
          setMaxPrice(roundedPrice);
          setPriceRange([0, roundedPrice]);
        }
      }
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

  // parse incoming section IDs and optional title (params.sectionIds expected to be encodeURIComponent(JSON.stringify([...ids])))
  useEffect(() => {
    if (params.sectionIds) {
      try {
        const raw = params.sectionIds;
        // handle either encoded or plain JSON
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

  // When filters are applied from the modal, close modal and mark filtersApplied
  const applyFilters = (filters) => {
    setSelectedCategory(filters.category);
    setSortBy(filters.sortBy);
    setPriceRange(filters.priceRange);
    setFilterTopSelling(!!filters.topSelling);
    setFilterNewArrival(!!filters.newArrival);
    setIsFilterModalVisible(false);
    setIsSectionView(false); // selecting filters should show filtered products rather than a section list
    setSectionIds([]);
    setSectionTitle(null);
    setFiltersApplied(true);
  };

  // Reset all filters and show full products list
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

  // Keep "filtersApplied" in sync if user changes selections directly (e.g. inside modal)
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

  const getFilteredAndSortedProducts = () => {
    // If top-selling or new-arrival filters are active, show those first (these override other filters)
    if (filterTopSelling || filterNewArrival) {
      // top-selling: sort by sold desc
      const topList = filterTopSelling
        ? [...products].filter(p => (p.sold || 0) > 0).sort((a, b) => (b.sold || 0) - (a.sold || 0))
        : [];
      // new-arrival: sort by createdAt desc (best-effort)
      const newList = filterNewArrival
        ? [...products].sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          })
        : [];
      if (filterTopSelling && !filterNewArrival) return topList;
      if (filterNewArrival && !filterTopSelling) return newList;
      // both: return union preserving topList order then append newList items not already included
      const seen = new Set();
      const union = [];
      topList.forEach(p => { if (!seen.has(String(p.id))) { seen.add(String(p.id)); union.push(p); }});
      newList.forEach(p => { if (!seen.has(String(p.id))) { seen.add(String(p.id)); union.push(p); }});
      return union;
    }

    // If we were navigated here with a list of product IDs, return those products in the same order.
    if (isSectionView && sectionIds && sectionIds.length > 0) {
      // preserve provided order; match by stringified ids
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
          {sectionTitle ? `${sectionTitle} (${filteredProducts.length})` : `All Products (${filteredProducts.length})`}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {filtersApplied && (
            <TouchableOpacity style={styles(theme).resetButton} onPress={resetFilters}>
              <Text style={styles(theme).resetText}>Reset</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles(theme).filterButton}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Icon name="sliders" size={20} color={theme.filterIconColor} />
          </TouchableOpacity>
        </View>
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
      />
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
});

export default ProductList;