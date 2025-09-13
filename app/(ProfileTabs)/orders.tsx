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
  id?: string;
  name?: string;
  price?: number;
  image?: string;
  description?: string;
  quantity?: number;
  discount?: number;
}

interface Order {
  id: string;
  createdAt: string;
  OrderedProducts: Product[];
  orderTotal: number;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [theme, setTheme] = useState(lightTheme);

  const loadThemePreference = async () => {
    try {
      const themeMode = await AsyncStorage.getItem('ThemeMode');
      setTheme(themeMode === '2' ? darkTheme : lightTheme);
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

  const calculateOrderTotal = (products: Product[]) => {
    return products.reduce((acc, product) => acc + calculateProductTotal(product), 0);
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
        setOrders([]);
        setLoading(false);
        return;
      }

      const ordersData = userOrders.map((order: any, index: number) => {
        const orderedProducts = order.OrderedProducts || [];
        const orderTotal = calculateOrderTotal(orderedProducts);

        return {
          id: order.id || `order_${index}`,
          createdAt: order.createdAt || 'Unknown date',
          OrderedProducts: orderedProducts.map((product: any, productIndex: number) => ({
            id: product.productId || `product_${index}_${productIndex}`,
            name: product.name,
            price: product.price,
            image: product.image,
            description: product.description,
            quantity: product.quantity || 1,
            discount: product.discount || 0,
            category: product.category || 'Uncategorized'
          })),
          orderTotal
        };
      });

      const total = ordersData.reduce((acc: number, order: Order) => acc + order.orderTotal, 0);

      setOrders(ordersData);
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

  const formatDate = (dateString: string) => {
    if (dateString === 'egsopjpgjeps0949' || dateString === 'Unknown date') {
      return 'Order Date Not Available';
    }
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const hasDiscount = item.discount && item.discount > 0;
    const discountedPrice = hasDiscount
      ? item.price! - (item.price! * item.discount! / 100)
      : item.price;
    const discountedSubtotal = calculateProductTotal(item);

    return (
      <TouchableOpacity
        style={[styles.productItem, { backgroundColor: theme.cardBackground }]}
        activeOpacity={0.8}
        onPress={() => navigateToProductDetail(item.id || '')}
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
                <MaterialIcons name="image-not-supported" size={24} color={theme.iconColorSecondary} />
              </View>
            )}
          </View>

          <View style={styles.productDetails}>
            <Text style={[styles.productName, { color: theme.textPrimary }]} numberOfLines={1}>
              {item.name || 'Unnamed Product'}
            </Text>
            <Text style={[styles.productDescription, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.description || 'No description available'}
            </Text>

            <View style={styles.priceQuantityRow}>
              {hasDiscount ? (
                <View style={styles.discountContainer}>
                  <Text style={[styles.originalPrice, { color: theme.originalPriceColor }]}>
                    ${item.price?.toFixed(2)}
                  </Text>
                  <Text style={[styles.discountedPrice, { color: theme.discountedPriceColor }]}>
                    ${discountedPrice?.toFixed(2)}
                  </Text>
                  <View style={[styles.discountBadge, { backgroundColor: theme.discountBadgeBackground }]}>
                    <Text style={[styles.discountBadgeText, { color: theme.discountTextColor }]}>
                      {item.discount}% OFF
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.regularPrice, { color: theme.priceColor }]}>
                  ${item.price?.toFixed(2)}
                </Text>
              )}

              <View style={[styles.quantityBadge, { backgroundColor: theme.quantityBadgeBackground }]}>
                <Text style={[styles.quantityText, { color: theme.quantityTextColor }]}>
                  Qty: {item.quantity}
                </Text>
              </View>
            </View>

            <Text style={[styles.subtotalText, { color: theme.subtotalValueColor }]}>
              Subtotal: ${discountedSubtotal.toFixed(2)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={[styles.orderCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderDate, { color: theme.textPrimary }]}>
            {formatDate(item.createdAt)}
          </Text>
          <View style={[styles.orderStatusContainer, { backgroundColor: theme.orderStatusBackground }]}>
            <Ionicons name="checkmark-circle" size={16} color={theme.iconColorSuccess} />
            <Text style={[styles.orderStatusText, { color: theme.textSuccess }]}>Delivered</Text>
          </View>
        </View>
        <Text style={[styles.orderTotal, { color: theme.subtotalValueColor }]}>
          Total: ${item.orderTotal.toFixed(2)}
        </Text>
      </View>

      <Text style={[styles.productsHeader, { color: theme.textSecondary }]}>
        {item.OrderedProducts.length} {item.OrderedProducts.length === 1 ? 'Product' : 'Products'}
      </Text>

      {item.OrderedProducts.map((product, index) => (
        <View key={product.id || index}>
          {renderProductItem({ item: product })}
        </View>
      ))}
    </View>
  );

  useEffect(() => {
    fetchUserOrders();
    loadThemePreference();
  }, []);

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

        {!loading && orders.length > 0 && (
          <View style={[styles.orderSummary, { backgroundColor: theme.summarySectionBackground }]}>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <MaterialIcons name="shopping-bag" size={24} color={theme.iconColorTertiary} />
                <Text style={[styles.summaryText, { color: theme.textPrimary }]}>
                  {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
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
        ) : orders.length === 0 ? (
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
            data={orders}
            renderItem={renderOrderItem}
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
  orderCard: {
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  orderStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productsHeader: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  productItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  productContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noProductImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    marginBottom: 6,
  },
  priceQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  discountedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  discountBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  discountBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  regularPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  quantityBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtotalText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default Orders;