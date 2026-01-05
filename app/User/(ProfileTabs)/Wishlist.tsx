import { AntDesign, Feather, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getProductById, updateUserData } from '../../../Backend/Firebase/DBAPI';
import { useUserStore } from '../../../Backend/Zustand/UserStore';
import { darkTheme, lightTheme } from '../../../Theme/ProfileTabs/WishlistTheme';
import DeleteModal from '../../GeneralComponent/DeleteModal';
import MiniAlert from '../../GeneralComponent/MiniAlert';

interface Product {
  id: string;
  name?: string;
  price?: number;
  image?: string;
  discount?: number;
  [key: string]: any;
}

const EMPTY_FAVORITES: string[] = [];

const Wishlist = () => {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [theme, setTheme] = useState(lightTheme);
  const [themeVersion, setThemeVersion] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const favoriteIds = Array.isArray(user?.Fav) ? (user?.Fav as string[]) : EMPTY_FAVORITES;
  const favoriteIdsKey = useMemo(() => JSON.stringify(favoriteIds), [favoriteIds]);
  const userId = user?.uid || user?.id || null;

  const loadTheme = useCallback(async () => {
    try {
      const themeMode = await AsyncStorage.getItem('ThemeMode');
      const isDark = themeMode === '2';
      setIsDarkMode(isDark);
      setTheme(isDark ? { ...darkTheme } : { ...lightTheme });
      setThemeVersion((version) => version + 1);
    } catch {
      setIsDarkMode(false);
      setTheme({ ...lightTheme });
    }
  }, []);

  const formatPrice = (price?: number) => {
    const normalizedPrice = typeof price === 'number' ? price : 0;
    return normalizedPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '0';
  };

  const calculateDiscountedPrice = (price: number = 0, discount = 0) =>
    discount > 0 ? price - (price * discount / 100) : price;

  const removeFromFavorites = async () => {
    if (!selectedProduct?.id || !userId || !user) return;

    const filteredFavorites = favoriteIds.filter((favId) => favId !== selectedProduct.id);

    setDeleteLoading(true);
    try {
      const response = await updateUserData(userId, { Fav: filteredFavorites });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update favorites');
      }

      setUser({ ...user, Fav: filteredFavorites });
      setFavorites((prev) => prev.filter((product) => product.id !== selectedProduct.id));
      setDeleteModalVisible(false);
      const productName = selectedProduct.name?.split(' ').slice(0, 2).join(' ') || 'Item';
      setAlertMsg(`${productName} removed from favorites`);
      setAlertType('success');
    } catch {
      setAlertMsg('Failed to remove item from favorites');
      setAlertType('error');
    } finally {
      setDeleteLoading(false);
      setSelectedProduct(null);
    }
  };

  const renderPrice = (item: Product) => {
    const basePrice = typeof item.price === 'number' ? item.price : 0;
    const hasDiscount = typeof item.discount === 'number' && item.discount > 0;
    const discountedPrice = calculateDiscountedPrice(basePrice, item.discount);

    return (
      <View style={theme.styles.priceContainer}>
        {hasDiscount ? (
          <>
            <View style={theme.styles.priceRow}>
              <Text style={theme.styles.originalPrice}>{formatPrice(basePrice)} EGP</Text>
              <View style={theme.styles.discountTag}>
                <Text style={theme.styles.discountValue}>-{item.discount}%</Text>
              </View>
            </View>
            <Text style={theme.styles.discountedPrice}>{formatPrice(discountedPrice)} EGP</Text>
          </>
        ) : (
          <Text style={theme.styles.regularPrice}>{formatPrice(basePrice)} EGP</Text>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={theme.styles.productCard}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '../Pages/SinglePage', params: { id: item.id } })}
    >
      <View style={theme.styles.productContent}>
        <View style={theme.styles.imageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={theme.styles.productImage} resizeMode="cover" />
          ) : (
            <View style={[theme.styles.productImage, theme.styles.noProductImage]}>
              <MaterialIcons name="image-not-supported" size={30} color={theme.colors.icon.placeholder} />
            </View>
          )}
          <View style={theme.styles.favoriteIndicator}>
            <Ionicons name="heart" size={14} color={theme.colors.accent.primary} />
            <Text style={theme.styles.favoriteText}>Favorited</Text>
          </View>
        </View>

        <View style={theme.styles.productDetails}>
          <Text style={theme.styles.productName} numberOfLines={2}>{item.name || 'Product'}</Text>
          <View style={theme.styles.infoRow}>
            <View style={theme.styles.infoChip}>
              <FontAwesome name="dollar" size={14} color={theme.colors.icon.priceIcon} />
              {renderPrice(item)}
            </View>
          </View>
          <View style={theme.styles.viewDetailsContainer}>
            <Text style={theme.styles.viewDetailsText}>View Details</Text>
            <Feather name="chevron-right" size={18} color={theme.colors.text.viewDetails} />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={theme.styles.removeButton}
        onPress={() => {
          setSelectedProduct(item);
          setDeleteModalVisible(true);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={20} color={theme.colors.accent.primary} />
        <Text style={theme.styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={theme.styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent.secondary} />
          <Text style={theme.styles.loadingText}>Fetching your wishlist...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={theme.styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={70} color={theme.colors.accent.tertiary} />
          <Text style={theme.styles.emptyTitle}>Something went wrong</Text>
          <Text style={theme.styles.emptyText}>{error}</Text>
          <TouchableOpacity style={theme.styles.retryButton} onPress={() => { }} activeOpacity={0.7}>
            <Text style={theme.styles.retryButtonText}>Try Again</Text>
            <AntDesign name="reload" size={20} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    if (!favorites.length) {
      return (
        <View style={theme.styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={theme.colors.accent.tertiary} />
          <Text style={theme.styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={theme.styles.emptyText}>Looks like you haven&apos;t added any products to your wishlist.</Text>
          <TouchableOpacity
            style={theme.styles.shopButton}
            onPress={() => router.replace('../(MainTaps)/Home')}
            activeOpacity={0.7}
          >
            <Text style={theme.styles.shopButtonText}>Explore Products</Text>
            <AntDesign name="arrow-right" size={20} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <View style={theme.styles.favoriteStatsContainer}>
          <Ionicons name="heart" size={22} color={theme.colors.icon.secondary} />
          <Text style={theme.styles.favoriteStatsText}>
            You have {favorites.length} {favorites.length === 1 ? 'product' : 'products'} in your wishlist
          </Text>
        </View>
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={theme.styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </>
    );
  };

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // userId derived directly from global state; no AsyncStorage fallback needed

  useEffect(() => {
    let isMounted = true;

    const fetchFavoriteProducts = async () => {
      const ids: string[] = favoriteIdsKey ? JSON.parse(favoriteIdsKey) : [];

      if (!ids.length) {
        if (isMounted) {
          setFavorites([]);
          setLoading(false);
          setError('');
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
      }

      try {
        const productsData = await Promise.all(
          [...ids].reverse().map(async (productId: string) => {
            const productResult = await getProductById(productId);
            return productResult ? ({ id: productId, ...productResult } as Product) : null;
          })
        );

        if (isMounted) {
          setFavorites(productsData.filter(Boolean) as Product[]);
          setError('');
        }
      } catch {
        if (isMounted) {
          setError('Failed to load favorites');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFavoriteProducts();

    return () => {
      isMounted = false;
    };
  }, [favoriteIdsKey]);

  useFocusEffect(
    useCallback(() => {
      loadTheme();
    }, [loadTheme])
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        key={`wishlist-theme-${themeVersion}`}
        colors={theme.colors.gradient as [string, string, ...string[]]}
        style={theme.styles.container}
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
            `Are you sure you want to remove ${selectedProduct.name || 'this item'} from your favorites?` :
            "Are you sure you want to remove this item from your favorites?"}
          confirmButtonText="Remove"
          isDarkMode={isDarkMode}
        />

        <View style={theme.styles.header}>
          <TouchableOpacity
            style={theme.styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back-circle-outline" size={36} color={theme.colors.icon.primary} />
          </TouchableOpacity>
          <View style={theme.styles.titleContainer}>
            <Text style={theme.styles.title}>My Wishlist</Text>
            {!loading && favorites.length > 0 && (
              <View style={theme.styles.countBadge}>
                <Text style={theme.styles.countText}>{favorites.length}</Text>
              </View>
            )}
          </View>
        </View>

        {renderContent()}
      </LinearGradient>
    </>
  );
};

export default Wishlist;