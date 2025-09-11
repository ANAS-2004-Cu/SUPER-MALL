import { AntDesign, Feather, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect } from 'expo-router';
import { arrayRemove } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import DeleteModal from '../../components/DeleteModal';
import MiniAlert from '../../components/MiniAlert';
import { auth, getDocument, updateDocument } from '../../Firebase/Firebase';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  discount?: number;
}

interface UserData {
  id: string;
  Fav?: string[];
  [key: string]: any;
}

const Wishlist = () => {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userId = auth.currentUser?.uid;

  const formatPrice = (price: number) => price?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";

  const calculateDiscountedPrice = (price: number, discount = 0) => 
    discount > 0 ? price - (price * discount / 100) : price;

  const fetchFavorites = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError('');
      
      const userResult = await getDocument("Users", userId);
      if (!userResult.success) {
        setError('Failed to fetch user data');
        return;
      }

      const favoriteIds = (userResult.data as UserData)?.Fav || [];
      if (!favoriteIds.length) {
        setFavorites([]);
        return;
      }

      const productPromises = [...favoriteIds].reverse().map(async (productId: string) => {
        const productResult = await getDocument("products", productId);
        return productResult.success ? { id: productId, ...productResult.data } as Product : null;
      });

      const productsData = await Promise.all(productPromises);
      setFavorites(productsData.filter(Boolean) as Product[]);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchFavorites();
  }, [userId]);

  // Fetch every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [userId])
  );

  const removeFromFavorites = async () => {
    if (!selectedProduct?.id || !userId) return;

    setDeleteLoading(true);
    try {
      const updateResult = await updateDocument("Users", userId, {
        Fav: arrayRemove(selectedProduct.id)
      });

      if (updateResult.success) {
        setFavorites(prev => prev.filter(item => item.id !== selectedProduct.id));
        setAlertMsg(`${selectedProduct.name.split(' ').slice(0, 2).join(' ')} removed from favorites`);
        setAlertType('success');
        setTimeout(() => setDeleteModalVisible(false), 2000);
      } else {
        setAlertMsg("Failed to remove item from favorites");
        setAlertType('error');
      }
    } catch (err) {
      console.error("Error removing from favorites:", err);
      setAlertMsg("Failed to remove item from favorites");
      setAlertType('error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderPrice = (item: Product) => {
    const hasDiscount = item.discount && item.discount > 0;
    const discountedPrice = calculateDiscountedPrice(item.price, item.discount);

    return (
      <View style={styles.priceContainer}>
        {hasDiscount ? (
          <>
            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>{formatPrice(item.price)} EGP</Text>
              <View style={styles.discountTag}>
                <Text style={styles.discountValue}>-{item.discount}%</Text>
              </View>
            </View>
            <Text style={styles.discountedPrice}>{formatPrice(discountedPrice)} EGP</Text>
          </>
        ) : (
          <Text style={styles.regularPrice}>{formatPrice(item.price)} EGP</Text>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/singlepage', params: { id: item.id } })}
    >
      <View style={styles.productContent}>
        <View style={styles.imageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
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
              {renderPrice(item)}
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
        onPress={() => {
          setSelectedProduct(item);
          setDeleteModalVisible(true);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        <Text style={styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8D6E63" />
          <Text style={styles.loadingText}>Fetching your wishlist...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={70} color="#A1887F" />
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFavorites} activeOpacity={0.7}>
            <Text style={styles.retryButtonText}>Try Again</Text>
            <AntDesign name="reload1" size={20} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    if (!favorites.length) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#A1887F" />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>Looks like you haven&apos;t added any products to your wishlist.</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.replace('../(tabs)/home')}
            activeOpacity={0.7}
          >
            <Text style={styles.shopButtonText}>Explore Products</Text>
            <AntDesign name="arrowright" size={20} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
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
          showsVerticalScrollIndicator={false}
        />
      </>
    );
  };

  return (
    <>
      <Stack.Screen name="Wishlist" options={{ headerShown: false }} />
      <LinearGradient colors={['white', '#FFE4C4']} style={styles.container}>
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
            onPress={() => router.back()}
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

        {renderContent()}
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
});

export default Wishlist;