import { Stack, router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions
} from 'react-native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { auth, db } from '../../Firebase/Firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { MaterialIcons, FontAwesome, Ionicons, AntDesign, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MiniAlert from '../../components/MiniAlert';
import DeleteModal from '../../components/DeleteModal';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  discount?: number;
}

const Wishlist = () => {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const userId = auth.currentUser?.uid;
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const emptyStateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const itemAnim = useRef(new Animated.Value(0)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const formatPrice = (price: number) => {
    return price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
  };

  const runItemAnimation = () => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (favorites.length > 0) {
      runItemAnimation();
    }
  }, [favorites]);

  const fetchFavorites = async () => {
    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      itemAnim.setValue(0);

      const userDocRef = doc(db, "Users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const userData = userDoc.data();
      const favoriteIds = userData.Fav || [];

      if (favoriteIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        setRefreshing(false);

        Animated.timing(emptyStateAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();

        return;
      }

      const productPromises = favoriteIds.map(async (productId: string) => {
        const productDocRef = doc(db, "products", productId);
        const productDoc = await getDoc(productDocRef);

        if (productDoc.exists()) {
          return {
            id: productId,
            ...productDoc.data(),
          } as Product;
        }
        return null;
      });

      const productsData = await Promise.all(productPromises);
      setFavorites(productsData.filter(product => product !== null) as Product[]);

      runItemAnimation();
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setError('');
    fetchFavorites();
  }, [userId]);

  useEffect(() => {
    fetchFavorites();
  }, [userId]);

  const confirmRemoveFromFavorites = (product: Product) => {
    setSelectedProduct(product);
    setDeleteModalVisible(true);
  };

  const removeFromFavorites = async () => {
    if (!selectedProduct || !userId) return;

    setDeleteLoading(true);
    try {
      const userDocRef = doc(db, "Users", userId);

      await updateDoc(userDocRef, {
        Fav: arrayRemove(selectedProduct.id)
      });

      setFavorites(prev => prev.filter(item => item.id !== selectedProduct.id));
      setAlertMsg(`${String(selectedProduct.name).split(' ').slice(0, 2).join(' ')} removed from your favorites`);
      setAlertType('success');

      setTimeout(() => {
        setDeleteModalVisible(false);
      }, 3000);
    } catch (err) {
      console.error("Error removing from favorites:", err);
      setAlertMsg("Failed to remove item from favorites");
      setAlertType('error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const navigateToProduct = (productId: string) => {
    router.push({
      pathname: '/singlepage',
      params: { id: productId }
    });
  };

  const renderItem = ({ item, index }: { item: Product, index: number }) => {
    const itemOpacity = itemAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    const itemTranslateY = itemAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
      extrapolate: 'clamp',
    });

    const discountedPrice = item.discount && item.discount > 0
      ? item.price - (item.price * item.discount / 100)
      : item.price;

    const hasDiscount = item.discount && item.discount > 0;

    return (
      <Animated.View style={{
        opacity: itemOpacity,
        transform: [{ translateY: itemTranslateY }]
      }}>
        <TouchableOpacity
          style={styles.productCard}
          activeOpacity={0.8}
          onPress={() => navigateToProduct(item.id)}
        >
          <View style={styles.productContent}>
            <View style={styles.imageContainer}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.productImage, styles.noProductImage]}>
                  <MaterialIcons name="image-not-supported" size={30} color="#a0a0a0" />
                </View>
              )}
              <View style={styles.favoriteIndicator}>
                <Ionicons name="heart" size={14} color="#FF6B6B" />
                <Text style={styles.favoriteText}>Favorited</Text>
              </View>
            </View>

            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <View style={styles.infoRow}>
                <View style={styles.infoChip}>
                  <FontAwesome name="dollar" size={14} color="#388E3C" />

                  <View style={styles.priceContainer}>
                    {hasDiscount ? (
                      <>
                        <View style={styles.priceRow}>
                          <Text style={styles.originalPrice}>{formatPrice(item.price)} EGP</Text>
                          <View style={styles.discountTag}>
                            <Text style={styles.discountValue}>-{item.discount}%</Text>
                          </View>
                        </View>
                        <Text style={styles.discountedPrice}>
                          {formatPrice(discountedPrice)} EGP
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.regularPrice}>{formatPrice(item.price)} EGP</Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.viewDetailsContainer}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Feather name="chevron-right" size={18} color="#555" />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => confirmRemoveFromFavorites(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <>
      <Stack.Screen
        name="Wishlist"
        options={{
          headerShown: false
        }}
      />
      <LinearGradient
        colors={['white', '#FFE4C4']}
        style={styles.container}
      >
        {alertMsg && (
          <MiniAlert
            message={alertMsg}
            type={alertType}
            onHide={() => setAlertMsg(null)}
          />
        )}

        <DeleteModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          onConfirm={removeFromFavorites}
          isLoading={deleteLoading}
          title="Remove from Favorites"
          message={selectedProduct ?
            `Are you sure you want to remove ${selectedProduct.name} from your favorites?` :
            "Are you sure you want to remove this item from your favorites?"}
          confirmButtonText="Remove"
        />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { router.back() }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back-circle-outline" size={36} color="#5D4037" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>My Wishlist</Text>
            {!loading && favorites.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{favorites.length}</Text>
              </View>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8D6E63" />
            <Text style={styles.loadingText}>Fetching your wishlist...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={70} color="#A1887F" />
            <Text style={styles.emptyTitle}>Something went wrong</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  animatePress();
                  onRefresh();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
                <AntDesign name="reload1" size={20} color="white" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color="#A1887F" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No Favorites Yet</Text>
            <Text style={styles.emptyText}>Looks like you haven't added any products to your wishlist.</Text>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => {
                  animatePress();
                  router.replace('../(tabs)/home');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.shopButtonText}>Explore Products</Text>
                <AntDesign name="arrowright" size={20} color="white" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : (
          <>
            <View style={styles.favoriteStatsContainer}>
              <Ionicons name="heart" size={22} color="#6D4C41" />
              <Text style={styles.favoriteStatsText}>
                You have {favorites.length} {favorites.length === 1 ? 'product' : 'products'} in your wishlist
              </Text>
            </View>
            <FlatList
              data={favorites}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#8D6E63']}
                  tintColor="#8D6E63"
                />
              }
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 55,
    zIndex: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4E342E',
    textAlign: 'center',
  },
  countBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 8,
  },
  countText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  favoriteStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: 15,
    marginBottom: 15,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  favoriteStatsText: {
    fontSize: 15,
    color: '#5D4037',
    fontWeight: '500',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  loadingText: {
    color: '#6D4C41',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  emptyIcon: {
    marginBottom: 15,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#5D4037',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#795548',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  shopButton: {
    backgroundColor: '#795548',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  shopButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17,
  },
  retryButton: {
    backgroundColor: '#8D6E63',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 30,
  },
  productCard: {
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#9E9E9E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
  },
  productContent: {
    flexDirection: 'row',
    padding: 12,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  productImage: {
    width: 100,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  noProductImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEEEEE',
  },
  favoriteIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  favoriteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 4,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 4,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 15,
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#616161',
    marginRight: 2,
    fontWeight: '500',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingVertical: 10,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B6B',
    marginLeft: 6,
  },
  priceContainer: {
    marginLeft: 5,
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  originalPrice: {
    fontSize: 13,
    color: '#777',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountedPrice: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: '#388E3C',
  },
  regularPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
  },
  discountTag: {
    backgroundColor: '#fce4ec',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountValue: {
    fontSize: 11,
    color: '#e91e63',
    fontWeight: 'bold',
  },
  priceWithDiscountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    flexWrap: 'wrap',
  },
  discountBadge: {
    fontSize: 12,
    color: '#e91e63',
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default Wishlist;