import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchUserOrders } from '../../../Backend/Firebase/DBAPI';
import { useUserStore } from '../../../Backend/Zustand/UserStore';
import { darkTheme, lightTheme } from '../../../Theme/ProfileTabs/OrdersTheme';

type FirestoreTimestamp = {
  seconds: number;
  nanoseconds?: number;
};

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Product {
  id?: string;
  productId?: string;
  name?: string;
  price?: number;
  finalPrice?: number;
  image?: string;
  description?: string;
  quantity?: number | string;
  totalItemPrice?: number;
  discount?: number | string;
  category?: string;
}

interface Order {
  id: string;
  createdAt: FirestoreTimestamp | string | number | Date | null;
  OrderedProducts: Product[];
  orderTotal: number;
  addressSnapshot?: Record<string, any> | null;
  paymentMethod?: string;
  paymentDetails?: Record<string, any> | null;
  shippingFee?: number;
  subtotal?: number;
  total?: number;
  walletPhone?: string;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [theme, setTheme] = useState(lightTheme);
  const [themeVersion, setThemeVersion] = useState(0);
  const user = useUserStore((state) => state.user);
  const userId = user?.uid || user?.id || null;

  const loadThemePreference = useCallback(async () => {
    try {
      const themeMode = await AsyncStorage.getItem('ThemeMode');
      setTheme(themeMode === '2' ? { ...darkTheme } : { ...lightTheme });
      setThemeVersion((version) => version + 1);
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  }, []);

  const normalizeNumberValue = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  // userId is derived from the global store; no AsyncStorage lookup required

  const handleOrderPress = (order: Order) => {
    try {
      const payload = buildOrderSummaryPayload(order);
      const encoded = encodeURIComponent(JSON.stringify(payload));
      router.push({
        pathname: '../Pages/OrderSummary',
        params: { order: encoded },
      });
    } catch (error) {
      console.error('Error navigating to order summary:', error);
    }
  };

  const toTimestampMs = (dateValue: Order['createdAt']) => {
    if (!dateValue) return 0;

    if (typeof dateValue === 'object' && dateValue !== null && 'seconds' in dateValue && typeof dateValue.seconds === 'number') {
      return dateValue.seconds * 1000 + Math.floor((dateValue.nanoseconds || 0) / 1_000_000);
    }

    if (dateValue instanceof Date) {
      return dateValue.getTime();
    }

    if (typeof dateValue === 'number') {
      return Number.isFinite(dateValue) ? dateValue : 0;
    }

    if (typeof dateValue === 'string') {
      const parsed = Date.parse(dateValue.trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  };

  const formatDate = (dateValue: Order['createdAt']) => {
    const fallbackText = 'Order Date Not Available';

    if (!dateValue) {
      return fallbackText;
    }

    try {
      if (typeof dateValue === 'object' && dateValue !== null && 'seconds' in dateValue && typeof dateValue.seconds === 'number') {
        const timestamp = dateValue.seconds * 1000 + Math.floor((dateValue.nanoseconds || 0) / 1_000_000);
        return new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }

      if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }

      if (typeof dateValue === 'number') {
        return new Date(dateValue).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      }

      if (typeof dateValue === 'string') {
        const trimmedDate = dateValue.trim();
        if (!trimmedDate || trimmedDate === 'Unknown date' || trimmedDate === 'egsopjpgjeps0949') {
          return fallbackText;
        }

        const parsedDate = Date.parse(trimmedDate);
        if (!Number.isNaN(parsedDate)) {
          return new Date(parsedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        }

        return trimmedDate;
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return fallbackText;
    }

    return fallbackText;
  };

  const buildOrderSummaryPayload = (order: Order) => ({
    ...order,
    createdAt: formatDate(order.createdAt),
    paymentDetails: order.paymentDetails ? { ...order.paymentDetails } : null,
    OrderedProducts: order.OrderedProducts.map(product => ({
      ...product,
      quantity: product.quantity,
      finalPrice: normalizeNumberValue(product.finalPrice, 0),
      totalItemPrice: normalizeNumberValue(product.totalItemPrice, 0),
    })),
  });

  const getPaymentBadgeConfig = (method?: string) => {
    const normalizedMethod = method?.toLowerCase().trim() ?? '';

    if (!normalizedMethod) {
      return null;
    }

    if (normalizedMethod.includes('visa') || normalizedMethod.includes('card')) {
      return { label: 'Card', icon: 'card-outline' as IoniconName, backgroundColor: '#1e88e5' };
    }

    if (normalizedMethod.includes('wallet') || normalizedMethod.includes('mobile')) {
      return { label: 'Wallet', icon: 'wallet-outline' as IoniconName, backgroundColor: '#2e7d32' };
    }

    if (normalizedMethod.includes('cash')) {
      return { label: 'Cash', icon: 'cash-outline' as IoniconName, backgroundColor: '#fb8c00' };
    }

    return { label: method || 'Payment', icon: 'card-outline' as IoniconName, backgroundColor: '#546e7a' };
  };

  const renderPaymentMethodBadge = (method?: string) => {
    const config = getPaymentBadgeConfig(method);
    if (!config) {
      return null;
    }

    return (
      <View style={[styles.paymentBadge, { backgroundColor: config.backgroundColor }]}>
        <Ionicons name={config.icon} size={14} color="#fff" />
        <Text style={styles.paymentBadgeText}>{config.label}</Text>
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const unitPrice = normalizeNumberValue(item.finalPrice ?? item.price, 0);
    const itemSubtotal = normalizeNumberValue(item.totalItemPrice, 0);
    const quantity = normalizeNumberValue(item.quantity, 0);

    return (
      <View
        style={[styles.productItem, { backgroundColor: theme.cardBackground }]}
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
              <Text style={[styles.regularPrice, { color: theme.priceColor }]}>
                ${unitPrice.toFixed(2)}
              </Text>

              <View style={[styles.quantityBadge, { backgroundColor: theme.quantityBadgeBackground }]}>
                <Text style={[styles.quantityText, { color: theme.quantityTextColor }]}>
                  Qty: {quantity}
                </Text>
              </View>
            </View>

            <Text style={[styles.subtotalText, { color: theme.subtotalValueColor }]}>
              Subtotal: ${itemSubtotal.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: theme.cardBackground }]}
      activeOpacity={0.85}
      onPress={() => handleOrderPress(item)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderDate, { color: theme.textPrimary }]}>
            {formatDate(item.createdAt)}
          </Text>
          <View style={styles.orderMetaRow}>
            <View style={[styles.orderStatusContainer, { backgroundColor: theme.orderStatusBackground }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.iconColorSuccess} />
              <Text style={[styles.orderStatusText, { color: theme.textSuccess }]}>Delivered</Text>
            </View>
            {renderPaymentMethodBadge(item.paymentMethod)}
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
    </TouchableOpacity>
  );

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      if (!userId) {
        if (isMounted) {
          setOrders([]);
          setTotalSpent(0);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
      }

      try {
        const response = await fetchUserOrders(userId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch orders');
        }

        const userOrders = Array.isArray(response.orders) ? response.orders : [];

        if (!userOrders.length) {
          if (isMounted) {
            setOrders([]);
            setTotalSpent(0);
          }
          return;
        }

        const ordersData = userOrders.map((order: any, index: number) => {
          const orderedProducts = Array.isArray(order.OrderedProducts) ? order.OrderedProducts : [];
          const mappedProducts = orderedProducts.map((product: any, productIndex: number) => {
            return {
              id: product.productId || product.id || `product_${index}_${productIndex}`,
              productId: product.productId || product.id || `product_${index}_${productIndex}`,
              name: product.name,
              price: normalizeNumberValue(product.price, 0),
              finalPrice: normalizeNumberValue(product.finalPrice, 0),
              image: product.image,
              description: product.description,
              quantity: product.quantity,
              totalItemPrice: normalizeNumberValue(product.totalItemPrice, 0),
              category: product.category || 'Uncategorized',
            };
          });

          const shippingFee = normalizeNumberValue(order.shippingFee, 0);
          const subtotal = normalizeNumberValue(order.subtotal ?? order.orderTotal, 0);
          const total = normalizeNumberValue(order.total ?? order.orderTotal, 0);
          const orderTotal = normalizeNumberValue(order.orderTotal ?? order.total, 0);

          return {
            id: order.id || `order_${index}`,
            createdAt: order.createdAt ?? null,
            OrderedProducts: mappedProducts,
            addressSnapshot: order.addressSnapshot || null,
            paymentMethod: order.paymentMethod || 'Not provided',
            paymentDetails: order.paymentDetails || null,
            shippingFee,
            subtotal,
            total,
            walletPhone: order.walletPhone ? String(order.walletPhone) : '',
            orderTotal,
          };
        });

        const sortedOrders = [...ordersData].sort((a, b) => toTimestampMs(b.createdAt) - toTimestampMs(a.createdAt));
        const totalSpentValue = sortedOrders.reduce((acc: number, order: Order) => acc + order.orderTotal, 0);

        if (isMounted) {
          setOrders(sortedOrders);
          setTotalSpent(totalSpentValue);
        }
      } catch (error) {
        console.error('Error fetching user orders:', error);
        if (isMounted) {
          setOrders([]);
          setTotalSpent(0);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadThemePreference();
    }, [loadThemePreference])
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        key={`orders-theme-${themeVersion}`}
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
              onPress={() => router.replace('../(MainTaps)/Home')}
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
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 0,
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
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
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