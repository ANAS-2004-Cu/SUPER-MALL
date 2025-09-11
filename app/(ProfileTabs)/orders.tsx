import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, getUserData } from '../../Firebase/Firebase';
import { darkTheme, lightTheme } from '../../Theme/ProfileTabs/OrdersTheme';

interface Product {
  id: string;
  name?: string;
  price?: number;
  image?: string;
  description?: string;
  quantity?: number;
  discount?: number;
}

const Orders = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    fetchUserOrders();
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const themeMode = await AsyncStorage.getItem('ThemeMode');
      if (themeMode === '2') {
        setTheme(darkTheme);
      } else {
        setTheme(lightTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const calculateProductTotal = (product: Product) => {
    const price = product.price || 0;
    const quantity = product.quantity || 1;
    const discount = product.discount || 0;
    const subtotal = price * quantity;
    return subtotal - (subtotal * discount / 100);
  };

  const fetchUserOrders = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userData = await getUserData(userId);
      const userOrders = userData?.Orders || [];

      if (!userOrders.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const ordersData = userOrders.map((order: any) => ({
        id: order.id || order.productId || Math.random().toString(),
        name: order.name,
        price: order.price,
        image: order.image,
        description: order.description,
        quantity: order.quantity || 1,
        discount: order.discount || 0
      }));

      const total = ordersData.reduce((acc: number, product: Product) => 
        acc + calculateProductTotal(product), 0
      );

      setProducts(ordersData);
      setTotalSpent(total);
    } catch (error) {
      console.error("Error fetching user orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToProductDetail = (productId: string) => {
    router.push({
      pathname: '/singlepage',
      params: { id: productId }
    });
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const hasDiscount = item.discount && item.discount > 0;
    const discountedPrice = hasDiscount 
      ? item.price! - (item.price! * item.discount! / 100)
      : item.price;

    const subtotal = (item.price || 0) * (item.quantity || 1);
    const discountedSubtotal = calculateProductTotal(item);

    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: theme.cardBackground }]}
        activeOpacity={0.8}
        onPress={() => navigateToProductDetail(item.id)}
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
              <View style={[styles.productImage, styles.noProductImage, { backgroundColor: theme.noImageBackground }]}>
                <MaterialIcons name="image-not-supported" size={30} color={theme.iconColorSecondary} />
              </View>
            )}
            <View style={[styles.orderStatusContainer, { backgroundColor: theme.orderStatusBackground }]}>
              <Ionicons name="checkmark-circle" size={14} color={theme.iconColorSuccess} />
              <Text style={[styles.orderStatusText, { color: theme.textSuccess }]}>Delivered</Text>
            </View>
          </View>

          <View style={styles.productDetails}>
            <Text style={[styles.productName, { color: theme.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.productDescription, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.description || 'No description available'}
            </Text>

            <View style={[styles.detailsContainer, { backgroundColor: theme.detailsBackground }]}>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <FontAwesome name="tag" size={14} color={theme.iconColorPrimary} />
                  <Text style={[styles.detailLabel, { color: theme.detailLabelColor }]}>Price:</Text>
                </View>

                {hasDiscount ? (
                  <View style={styles.discountContainer}>
                    <Text style={[styles.originalPrice, { color: theme.originalPriceColor }]}>${item.price?.toFixed(2)}</Text>
                    <View style={styles.discountInfoContainer}>
                      <Text style={[styles.discountedPrice, { color: theme.discountedPriceColor }]}>${discountedPrice?.toFixed(2)}</Text>
                      <View style={[styles.discountBadgeContainer, { backgroundColor: theme.discountBadgeBackground }]}>
                        <Text style={[styles.discountBadgeText, { color: theme.discountTextColor }]}>{item.discount}% OFF</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.regularPrice, { color: theme.priceColor }]}>${item.price?.toFixed(2)}</Text>
                )}
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <Ionicons name="cart-outline" size={15} color={theme.iconColorPrimary} />
                  <Text style={[styles.detailLabel, { color: theme.detailLabelColor }]}>Quantity:</Text>
                </View>
                <View style={[styles.quantityBadge, { backgroundColor: theme.quantityBadgeBackground }]}>
                  <Text style={[styles.quantityText, { color: theme.quantityTextColor }]}>{item.quantity}</Text>
                </View>
              </View>

              <View style={[styles.subtotalContainer, { borderTopColor: theme.separatorColor }]}>
                <Text style={[styles.subtotalLabel, { color: theme.subtotalLabelColor }]}>Subtotal:</Text>
                {hasDiscount ? (
                  <View style={styles.subtotalValues}>
                    <Text style={[styles.originalSubtotal, { color: theme.originalPriceColor }]}>${subtotal.toFixed(2)}</Text>
                    <Text style={[styles.subtotalValue, { color: theme.subtotalValueColor }]}>${discountedSubtotal.toFixed(2)}</Text>
                  </View>
                ) : (
                  <Text style={[styles.subtotalValue, { color: theme.subtotalValueColor }]}>${subtotal.toFixed(2)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <LinearGradient
        colors={theme.gradientColors as [string, string, ...string[]]}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { router.back() }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back-circle-outline" size={36} color={theme.backButtonColor} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.titleColor }]}>My Orders</Text>
        </View>

        {!loading && products.length > 0 && (
          <View style={[styles.orderSummary, { backgroundColor: theme.summarySectionBackground }]}>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <MaterialIcons name="shopping-bag" size={24} color={theme.iconColorTertiary} />
                <Text style={[styles.summaryText, { color: theme.textPrimary }]}>
                  {products.length} {products.length === 1 ? 'Order' : 'Orders'}
                </Text>
              </View>
              <View style={[styles.summarySeparator, { backgroundColor: theme.separatorColor }]} />
              <View style={styles.summaryItem}>
                <FontAwesome name="dollar" size={20} color={theme.iconColorSuccess} />
                <Text style={[styles.summaryText, { color: theme.textPrimary }]}>
                  Total: ${totalSpent.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.iconColorTertiary} />
            <Text style={[styles.loadingText, { color: theme.loadingTextColor }]}>Fetching your orders...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={theme.emptyIconColor} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: theme.emptyTitleColor }]}>No Orders Yet</Text>
            <Text style={[styles.emptyText, { color: theme.emptyTextColor }]}>Looks like you haven&apos;t placed any orders.</Text>
            <TouchableOpacity
              style={[styles.shopButton, { backgroundColor: theme.shopButtonBackground }]}
              onPress={() => router.replace('../(tabs)/home')}
              activeOpacity={0.7}
            >
              <Text style={[styles.shopButtonText, { color: theme.shopButtonTextColor }]}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={renderProductItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
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
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  orderSummary: {
    marginHorizontal: 15,
    marginBottom: 20,
    marginTop: 5,
    borderRadius: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '500',
  },
  summarySeparator: {
    width: 1,
    height: '60%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  loadingText: {
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
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  shopButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  shopButtonText: {
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
  },
  noProductImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderStatusContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  detailsContainer: {
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 5,
  },
  regularPrice: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  discountContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginRight: 5,
  },
  discountInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountedPrice: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  discountBadgeContainer: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  quantityBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtotalValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalSubtotal: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    marginRight: 5,
  },
});

export default Orders;