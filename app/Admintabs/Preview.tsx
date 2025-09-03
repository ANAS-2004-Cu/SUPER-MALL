import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
    LayoutAnimation,
    ScrollView,
    RefreshControl,
    ListRenderItemInfo
  } from 'react-native';
  import React, { useEffect, useState } from 'react';
  import MaterialIcons from '@expo/vector-icons/MaterialIcons';
  import FontAwesome from '@expo/vector-icons/FontAwesome';
  import { db } from '../../Firebase/Firebase';
  import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
  import Entypo from '@expo/vector-icons/Entypo';
  import MiniAlert from '../../components/MiniAlert';
  import { LinearGradient } from 'expo-linear-gradient';
  import { Ionicons } from '@expo/vector-icons';
  import DeleteModal from '../../components/DeleteModal';
  import EditProductModal from '../../components/EditProductModal';
  
  interface Product {
    id: string;
    name?: string;
    price?: number;
    description?: string;
    category?: string;
    image?: string;
    discount?: number;
  }
  
  interface EditingProduct extends Omit<Product, 'price' | 'discount'> {
    price?: string;
    discount?: string;
  }
  
  const Preview = () => {
    const [Products, setProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [refresh, setRefresh] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'error' | null>('success');
    const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [loadingb, setLoadingb] = useState<boolean>(false);
    const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  
    const colRef = collection(db, "products");
  
    const getProducts = async () => {
      try {
        setLoading(true);
        const querysnapshot = await getDocs(colRef);
        var productsArr = querysnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsArr);
        setAllProducts(productsArr);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
  
    useEffect(() => {
      getProducts();
    }, [refresh]);
  
    useEffect(() => {
      const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
        setShowKeyboard(true);
      });
      const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        setShowKeyboard(false);
      });
      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }, []);
  
    useEffect(() => {
      if (allProducts.length === 0) return;
  
      let filteredProducts = [...allProducts];
  
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredProducts = filteredProducts.filter(item =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }
  
      if (activeFilter) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  
        switch (activeFilter) {
          case 'price_low_high':
            filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
          case 'price_high_low':
            filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
          case 'name_a_z':
            filteredProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
          case 'name_z_a':
            filteredProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;
        }
      }
  
      setProducts(filteredProducts);
    }, [searchQuery, activeFilter, allProducts]);
  
    const handleFilterToggle = (filter: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveFilter(activeFilter === filter ? null : filter);
    };
  
    const clearSearch = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSearchQuery('');
      Keyboard.dismiss();
    };
  
    const deleteProduct = async (item: Product) => {
      setLoadingb(true);
      try {
        const docRef = doc(db, 'products', item.id);
        await deleteDoc(docRef);
        setAlertMsg('Product deleted successfully');
        setTimeout(() => {
          setModalVisible(false);
          setRefresh(!refresh);
        }, 3000);
      } catch (err) {
        console.error(err);
        setAlertMsg('Failed to delete product');
      } finally {
        setLoadingb(false);
      }
    };
  
    const handleEdit = (item: Product) => {
      setEditingProduct({
        ...item,
        price: item.price?.toString() || '0',
        discount: item.discount?.toString() || '0'
      });
      setEditModalVisible(true);
    };
  
    const onRefresh = () => {
      setRefreshing(true);
      setSearchQuery('');
      setActiveFilter(null);
      getProducts();
    };
  
    const renderItem = ({ item }: ListRenderItemInfo<Product>) => {
      const isExpanded = expanded === item.id;
      const discountedPrice = item.price && item.discount
        ? item.price - (item.price * item.discount / 100)
        : item.price;
  
      return (
        <View style={styles.card}>
          <LinearGradient
            colors={['#E6F7FF', '#FFFFFF']}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <View style={styles.imageContainer}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.noImagePlaceholder]}>
                    <MaterialIcons name="image-not-supported" size={24} color="#bbb" />
                  </View>
                )}
              </View>
  
              <View style={styles.productInfo}>
                {item.name && item.name.length > 20 ? (
                  isExpanded ? (
                    <View>
                      <Text style={styles.productName}>{item.name}</Text>
                      <TouchableOpacity onPress={() => setExpanded(null)}>
                        <Text style={styles.readMore}>Show less</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.productName}>{item.name.substring(0, 20)}...</Text>
                      <TouchableOpacity onPress={() => setExpanded(item.id)}>
                        <Text style={styles.readMore}>Read more</Text>
                      </TouchableOpacity>
                    </View>
                  )
                ) : (
                  <Text style={styles.productName}>{item.name || 'No Name'}</Text>
                )}
  
                <View style={styles.priceContainer}>
                  <FontAwesome name="dollar" size={16} color="#4CAF50" />
                  {item.discount && item.discount > 0 ? (
                    <View style={styles.priceWithDiscountContainer}>
                      <Text style={styles.originalPrice}>{(item.price || 0).toFixed(2)}</Text>
                      <Text style={styles.priceText}>{discountedPrice?.toFixed(2)}</Text>
                      <Text style={styles.discountBadge}>(-{item.discount}%)</Text>
                    </View>
                  ) : (
                    <Text style={styles.priceText}>{(item.price || 0).toFixed(2)}</Text>
                  )}
                </View>
  
                {item.description && (
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
            </View>
  
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => {
                  setSelectedProduct(item);
                  setModalVisible(true);
                }}
              >
                <MaterialIcons name="delete" size={20} color="#fff" />
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={[styles.actionButton, styles.updateButton]}
                onPress={() => handleEdit(item)}
              >
                <MaterialIcons name="edit" size={20} color="#fff" />
                <Text style={styles.buttonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      );
    };
  
    return (
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Loading Products...</Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            {alertMsg && (
              <MiniAlert
                message={alertMsg}
                type="error"
                onHide={() => setAlertMsg(null)}
              />
            )}
  
            <DeleteModal
              visible={modalVisible}
              onClose={() => setModalVisible(false)}
              onConfirm={() => selectedProduct && deleteProduct(selectedProduct)}
              isLoading={loadingb}
              title={`Delete ${selectedProduct?.name ? String(selectedProduct.name).split(' ').slice(0, 2).join(' ') : 'Product'}`}
              message="Are you sure you want to delete this product? This action cannot be undone."
              confirmButtonText="Delete"
              cancelButtonText="Cancel"
            />
  
            <EditProductModal
              visible={editModalVisible}
              onClose={() => setEditModalVisible(false)}
              editingProduct={editingProduct}
              setEditingProduct={setEditingProduct}
              onRefresh={() => setRefresh(!refresh)}
            />
  
            <View style={styles.header}>
              <Entypo name="list" size={24} color="#2d3436" />
              <Text style={styles.title}>Products List</Text>
            </View>
  
            <View style={styles.searchContainer}>
              <View style={[
                styles.searchInputContainer,
                isSearchFocused && styles.searchInputFocused
              ]}>
                <MaterialIcons name="search" size={22} color="#888" style={styles.searchIcon} />
                <TextInput
                  placeholder='Search products...'
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    if (!showKeyboard) setIsSearchFocused(false);
                  }}
                  onChangeText={(text) => setSearchQuery(text)}
                  style={styles.searchInput}
                  value={searchQuery}
                  placeholderTextColor="#999"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color="#888" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
  
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Sort by:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    activeFilter === 'price_low_high' && styles.activeFilterButton
                  ]}
                  onPress={() => handleFilterToggle('price_low_high')}
                >
                  <FontAwesome
                    name="sort-amount-asc"
                    size={16}
                    color={activeFilter === 'price_low_high' ? '#fff' : '#333'}
                  />
                  <Text style={[
                    styles.filterButtonText,
                    activeFilter === 'price_low_high' && styles.activeFilterText
                  ]}>
                    Price: Low to High
                  </Text>
                </TouchableOpacity>
  
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    activeFilter === 'price_high_low' && styles.activeFilterButton
                  ]}
                  onPress={() => handleFilterToggle('price_high_low')}
                >
                  <FontAwesome
                    name="sort-amount-desc"
                    size={16}
                    color={activeFilter === 'price_high_low' ? '#fff' : '#333'}
                  />
                  <Text style={[
                    styles.filterButtonText,
                    activeFilter === 'price_high_low' && styles.activeFilterText
                  ]}>
                    Price: High to Low
                  </Text>
                </TouchableOpacity>
  
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    activeFilter === 'name_a_z' && styles.activeFilterButton
                  ]}
                  onPress={() => handleFilterToggle('name_a_z')}
                >
                  <FontAwesome
                    name="sort-alpha-asc"
                    size={16}
                    color={activeFilter === 'name_a_z' ? '#fff' : '#333'}
                  />
                  <Text style={[
                    styles.filterButtonText,
                    activeFilter === 'name_a_z' && styles.activeFilterText
                  ]}>
                    Name: A to Z
                  </Text>
                </TouchableOpacity>
  
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    activeFilter === 'name_z_a' && styles.activeFilterButton
                  ]}
                  onPress={() => handleFilterToggle('name_z_a')}
                >
                  <FontAwesome
                    name="sort-alpha-desc"
                    size={16}
                    color={activeFilter === 'name_z_a' ? '#fff' : '#333'}
                  />
                  <Text style={[
                    styles.filterButtonText,
                    activeFilter === 'name_z_a' && styles.activeFilterText
                  ]}>
                    Name: Z to A
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
  
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsText}>
                {Products.length} {Products.length === 1 ? 'product' : 'products'} found
              </Text>
            </View>
  
            {Products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inventory" size={50} color="#777" />
                <Text style={styles.emptyText}>
                  {allProducts.length === 0 ? 'No products available' : 'No products match your search'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={Products}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#4a90e2']}
                    tintColor="#4a90e2"
                  />
                }
              />
            )}
          </View>
        )}
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    contentContainer: {
      flex: 1,
      paddingTop: 50,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: '#2d3436',
      marginTop: 15,
      fontSize: 16,
      fontWeight: '500'
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#2d3436',
      marginLeft: 10,
    },
    searchContainer: {
      paddingHorizontal: 15,
      marginBottom: 10,
      marginTop: 5,
    },
    searchInputContainer: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      borderRadius: 10,
      alignItems: 'center',
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: '#ddd',
      height: 46,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    searchInputFocused: {
      borderColor: 'purple',
      shadowOpacity: 0.2,
      elevation: 4,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      fontSize: 16,
      color: '#333',
    },
    clearButton: {
      padding: 4,
    },
    filterContainer: {
      paddingHorizontal: 15,
      marginBottom: 10,
    },
    filterLabel: {
      fontSize: 14,
      color: '#555',
      marginBottom: 8,
      fontWeight: '500',
    },
    filterScroll: {
      paddingRight: 15,
      paddingVertical: 5,
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f8ff',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: '#add8e6',
    },
    activeFilterButton: {
      backgroundColor: 'purple',
      borderColor: '#9370db',
    },
    filterButtonText: {
      color: '#333',
      marginLeft: 6,
      fontWeight: '500',
      fontSize: 14,
    },
    activeFilterText: {
      color: '#fff',
    },
    resultsContainer: {
      paddingHorizontal: 15,
      marginBottom: 10,
      alignItems: 'flex-end',
    },
    resultsText: {
      fontSize: 12,
      color: '#666',
      fontStyle: 'italic',
    },
    listContent: {
      paddingHorizontal: 15,
      paddingBottom: 20,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: '#777',
      marginTop: 10,
      textAlign: 'center',
    },
    card: {
      marginBottom: 15,
      borderRadius: 10,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardGradient: {
      padding: 16,
      borderRadius: 10,
    },
    cardHeader: {
      flexDirection: 'row',
    },
    imageContainer: {
      marginRight: 15,
    },
    productImage: {
      width: 100,
      height: 100,
      borderRadius: 10,
      backgroundColor: '#f5f5f5',
    },
    noImagePlaceholder: {
      backgroundColor: '#f1f1f1',
      justifyContent: 'center',
      alignItems: 'center',
    },
    productInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    productName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#2d3436',
      marginBottom: 4,
    },
    readMore: {
      fontSize: 12,
      color: 'purple',
      fontWeight: '500',
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 6,
    },
    priceText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#4CAF50',
      marginLeft: 5,
    },
    description: {
      fontSize: 14,
      color: '#555',
      marginTop: 4,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 15,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      flex: 1,
      marginHorizontal: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.5,
      elevation: 2,
    },
    deleteButton: {
      backgroundColor: '#ff6b6b',
    },
    updateButton: {
      backgroundColor: '#4a90e2',
    },
    buttonText: {
      color: '#fff',
      fontWeight: 'bold',
      marginLeft: 8,
    },
    priceWithDiscountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 4,
    },
    originalPrice: {
      fontSize: 14,
      color: '#777',
      textDecorationLine: 'line-through',
      marginRight: 5,
    },
    discountBadge: {
      fontSize: 12,
      color: '#e91e63',
      fontWeight: '500',
      marginLeft: 4,
    },
  });
  
  export default Preview;