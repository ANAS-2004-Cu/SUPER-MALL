import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { AppState, Dimensions, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from "react-native-vector-icons/Feather";
import MiniAlert from '../../components/Component/MiniAlert';
import ProductCard from '../../components/Component/ProductCard';
import {
  getCollection,
  onAuthStateChange
} from '../../Firebase/Firebase';
import FilterModal from '../../Modal/FilterModal';
import { darkTheme, lightTheme } from '../../Theme/Tabs/ProductsTheme';

const { width } = Dimensions.get('window');

const ProductList = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
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

  const applyDiscount = (price, discount = 0) => Math.floor(price - (price * discount) / 100);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: null, type }), 3000);
  };

  // وظيفة للتحقق من الثيم وتحديثه
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

  // الاستماع لتغييرات حالة التطبيق
  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        // عند عودة التطبيق للنشاط، تحقق من الثيم
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

  // تحميل البيانات وضبط فحص الثيم الدوري
  useEffect(() => {
    // التحقق من الثيم عند بدء التشغيل
    checkTheme();
    
    // ضبط فحص دوري للثيم كل ثانية
    const themeCheckInterval = setInterval(checkTheme, 1000);
    
    const unsubscribeAuth = onAuthStateChange(setCurrentUser);

    getCollection("products").then(result => {
      if (result.success) {
        setProducts(result.data);
        const uniqueCategories = ['All', ...new Set(result.data.map(product => product.category).filter(Boolean))];
        setCategories(uniqueCategories);

        if (result.data.length > 0) {
          const highestPrice = Math.max(...result.data.map(product => product.price));
          setMaxPrice(Math.ceil(highestPrice / 100) * 100);
          setPriceRange([0, Math.ceil(highestPrice / 100) * 100]);
        }
      }
    });

    // تنظيف عند إزالة المكون
    return () => {
      unsubscribeAuth();
      clearInterval(themeCheckInterval);
    };
  }, []);

  const getFilteredAndSortedProducts = () => {
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

  const applyFilters = (filters) => {
    setSelectedCategory(filters.category);
    setSortBy(filters.sortBy);
    setPriceRange(filters.priceRange);
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
        <Text style={styles(theme).heading}>All Products ({filteredProducts.length})</Text>
        <TouchableOpacity
          style={styles(theme).filterButton}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Icon name="sliders" size={20} color={theme.filterIconColor} />
        </TouchableOpacity>
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
});

export default ProductList;