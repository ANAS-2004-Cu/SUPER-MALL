import { AntDesign, Feather, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect } from 'expo-router';
import { arrayRemove } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import MiniAlert from '../../components/Component/MiniAlert';
import { auth, getDocument, updateDocument } from '../../Firebase/Firebase';
import DeleteModal from '../../Modal/DeleteModal';
import { darkTheme, lightTheme } from '../../Theme/ProfileTabs/WishlistTheme';

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
  const [theme, setTheme] = useState(lightTheme);

  const userId = auth.currentUser?.uid;

  // Load theme from AsyncStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const themeMode = await AsyncStorage.getItem('ThemeMode');
        setTheme(themeMode === '2' ? darkTheme : lightTheme);
      } catch (error) {
        console.error('Error loading theme:', error);
        setTheme(lightTheme);
      }
    };
    
    loadTheme();
  }, []);

  // Listen for theme changes
  useFocusEffect(
    useCallback(() => {
      const checkTheme = async () => {
        const themeMode = await AsyncStorage.getItem('ThemeMode');
        setTheme(themeMode === '2' ? darkTheme : lightTheme);
      };
      
      checkTheme();
    }, [])
  );

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
      <View style={theme.styles.priceContainer}>
        {hasDiscount ? (
          <>
            <View style={theme.styles.priceRow}>
              <Text style={theme.styles.originalPrice}>{formatPrice(item.price)} EGP</Text>
              <View style={theme.styles.discountTag}>
                <Text style={theme.styles.discountValue}>-{item.discount}%</Text>
              </View>
            </View>
            <Text style={theme.styles.discountedPrice}>{formatPrice(discountedPrice)} EGP</Text>
          </>
        ) : (
          <Text style={theme.styles.regularPrice}>{formatPrice(item.price)} EGP</Text>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={theme.styles.productCard}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/singlepage', params: { id: item.id } })}
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
          <Text style={theme.styles.productName} numberOfLines={2}>{item.name}</Text>
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
          <TouchableOpacity style={theme.styles.retryButton} onPress={fetchFavorites} activeOpacity={0.7}>
            <Text style={theme.styles.retryButtonText}>Try Again</Text>
            <AntDesign name="reload1" size={20} color="white" />
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
            onPress={() => router.replace('../(tabs)/home')}
            activeOpacity={0.7}
          >
            <Text style={theme.styles.shopButtonText}>Explore Products</Text>
            <AntDesign name="arrowright" size={20} color="white" />
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

  return (
    <>
      <Stack.Screen name="Wishlist" options={{ headerShown: false }} />
      <LinearGradient colors={theme.colors.gradient  as [string, string, ...string[]]} style={theme.styles.container}>
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